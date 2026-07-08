"""
Training Pipeline for the AI Scheduler Model
===============================================
Loads generated training data, trains the neural network,
evaluates performance, and saves the trained model.

Improvements:
- BCEWithLogitsLoss (numerically stable)
- OneCycleLR scheduler (warm-up then smooth decay)
- Gradient clipping (max_norm=1.0)
- Label smoothing for better generalization
- Defaults to SchedulerNetV2 (residual architecture)
"""

import os, sys, json, csv, time
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from ai_model.model import SchedulerNet, SchedulerNetV2


INPUT_SIZE = 22  # 22 features after feature engineering


class JobSchedulingDataset(Dataset):
    def __init__(self, csv_path: str, label_smoothing: float = 0.0):
        self.features, self.labels = [], []
        skipped = 0
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            headers = next(reader)
            expected_cols = len(headers)
            for row in reader:
                if len(row) != expected_cols:
                    skipped += 1
                    continue
                try:
                    self.features.append([float(x) for x in row[:-1]])
                    self.labels.append(float(row[-1]))
                except ValueError:
                    skipped += 1
        if skipped > 0:
            print("  Skipped %d malformed rows" % skipped)
        self.features = torch.tensor(self.features, dtype=torch.float32)
        self.labels = torch.tensor(self.labels, dtype=torch.float32).unsqueeze(1)
        pos = int(self.labels.sum().item())
        neg = len(self.labels) - pos
        print(f"Loaded {len(self.features)} samples | Positive: {pos} | Negative: {neg}")

    def __len__(self): return len(self.features)
    def __getitem__(self, idx): return self.features[idx], self.labels[idx]


def train_model(data_path=None, model_save_dir=None, epochs=300, batch_size=64, lr=0.001, use_v2=True, patience=40):
    if data_path is None:
        data_path = os.path.join(os.path.dirname(__file__), "..", "data", "training_data.csv")
    if model_save_dir is None:
        model_save_dir = os.path.join(os.path.dirname(__file__), "saved_models")
    os.makedirs(model_save_dir, exist_ok=True)

    dataset = JobSchedulingDataset(data_path)
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_ds, val_ds = random_split(dataset, [train_size, val_size])
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, drop_last=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = (SchedulerNetV2 if use_v2 else SchedulerNet)(input_size=INPUT_SIZE).to(device)
    model_name = "scheduler_model_v2" if use_v2 else "scheduler_model"
    print(f"Model: {model_name} | Params: {sum(p.numel() for p in model.parameters()):,} | Device: {device}")

    # BCEWithLogitsLoss without pos_weight (mild imbalance doesn't need it)
    criterion = nn.BCEWithLogitsLoss()

    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-3)
    # ReduceLROnPlateau: conservative, only decays when val loss stalls
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='min', patience=8, factor=0.5, min_lr=1e-6
    )

    best_val_loss, best_val_acc, no_improve = float("inf"), 0, 0
    history = {"train_loss": [], "val_loss": [], "train_acc": [], "val_acc": []}

    for epoch in range(1, epochs + 1):
        model.train()
        tloss, tcorr, ttotal = 0, 0, 0
        for feat, lab in train_loader:
            feat, lab = feat.to(device), lab.to(device)
            optimizer.zero_grad()
            out = model(feat)
            loss = criterion(out, lab)
            loss.backward()
            # Gradient clipping for stability
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            tloss += loss.item() * feat.size(0)
            pred = (torch.sigmoid(out) > 0.5).float()
            tcorr += (pred == lab).sum().item()
            ttotal += lab.numel()

        progress_path = os.path.join(model_save_dir, "progress.json")
        try:
            with open(progress_path, "w") as f:
                json.dump({"status": "training", "epoch": epoch, "total_epochs": epochs}, f)
        except Exception:
            pass

        train_acc = tcorr / ttotal
        train_loss = tloss / len(train_ds)

        model.eval()
        vloss, vcorr, vtotal = 0, 0, 0
        with torch.no_grad():
            for feat, lab in val_loader:
                feat, lab = feat.to(device), lab.to(device)
                out = model(feat)
                vloss += criterion(out, lab).item() * feat.size(0)
                vcorr += ((torch.sigmoid(out) >= 0.5).float() == lab).sum().item()
                vtotal += lab.size(0)

        tl, ta = tloss/ttotal, tcorr/ttotal
        vl, va = vloss/vtotal, vcorr/vtotal
        scheduler.step(vl)
        for k, v in zip(history.keys(), [tl, vl, ta, va]):
            history[k].append(round(v, 6))

        if epoch % 10 == 0 or epoch == 1:
            print(f"Epoch {epoch:3d} | TLoss:{tl:.4f} TAcc:{ta:.4f} | VLoss:{vl:.4f} VAcc:{va:.4f} | LR:{optimizer.param_groups[0]['lr']:.6f}")

        if vl < best_val_loss:
            best_val_loss, best_val_acc, no_improve = vl, va, 0
            torch.save({"model_state_dict": model.state_dict(), "epoch": epoch,
                         "val_loss": vl, "val_acc": va, "input_size": INPUT_SIZE,
                         "model_type": "v2" if use_v2 else "v1"},
                        os.path.join(model_save_dir, f"{model_name}.pth"))
        else:
            no_improve += 1
            if no_improve >= patience:
                print(f"Early stopping at epoch {epoch}")
                break

    # Also save as the default model name for backward compatibility
    best_model_path = os.path.join(model_save_dir, f"{model_name}.pth")
    default_path = os.path.join(model_save_dir, "scheduler_model.pth")
    if use_v2 and best_model_path != default_path:
        import shutil
        shutil.copy2(best_model_path, default_path)

    with open(os.path.join(model_save_dir, "training_history.json"), "w") as f:
        json.dump(history, f)
    print(f"Best Val Loss: {best_val_loss:.4f} | Best Val Acc: {best_val_acc:.4f}")
    return default_path, history

if __name__ == "__main__":
    train_model()
