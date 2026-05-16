"""
Training Pipeline for the AI Scheduler Model
===============================================
Loads generated training data, trains the neural network,
evaluates performance, and saves the trained model.
"""

import os, sys, json, csv, time
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from ai_model.model import SchedulerNet, SchedulerNetV2


class JobSchedulingDataset(Dataset):
    def __init__(self, csv_path: str):
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
        print(f"Loaded {len(self.features)} samples | Positive: {pos} | Negative: {len(self.labels)-pos}")

    def __len__(self): return len(self.features)
    def __getitem__(self, idx): return self.features[idx], self.labels[idx]


def train_model(data_path=None, model_save_dir=None, epochs=100, batch_size=64, lr=0.001, use_v2=False, patience=15):
    if data_path is None:
        data_path = os.path.join(os.path.dirname(__file__), "..", "data", "training_data.csv")
    if model_save_dir is None:
        model_save_dir = os.path.join(os.path.dirname(__file__), "saved_models")
    os.makedirs(model_save_dir, exist_ok=True)

    dataset = JobSchedulingDataset(data_path)
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_ds, val_ds = random_split(dataset, [train_size, val_size])
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = (SchedulerNetV2 if use_v2 else SchedulerNet)(input_size=10).to(device)
    model_name = "scheduler_model_v2" if use_v2 else "scheduler_model"
    print(f"Model: {model_name} | Params: {sum(p.numel() for p in model.parameters()):,} | Device: {device}")

    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)

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
            optimizer.step()
            tloss += loss.item() * feat.size(0)
            tcorr += ((out >= 0.5).float() == lab).sum().item()
            ttotal += lab.size(0)

        model.eval()
        vloss, vcorr, vtotal = 0, 0, 0
        with torch.no_grad():
            for feat, lab in val_loader:
                feat, lab = feat.to(device), lab.to(device)
                out = model(feat)
                vloss += criterion(out, lab).item() * feat.size(0)
                vcorr += ((out >= 0.5).float() == lab).sum().item()
                vtotal += lab.size(0)

        tl, ta = tloss/ttotal, tcorr/ttotal
        vl, va = vloss/vtotal, vcorr/vtotal
        scheduler.step(vl)
        for k, v in zip(history.keys(), [tl, vl, ta, va]):
            history[k].append(round(v, 6))

        if epoch % 10 == 0 or epoch == 1:
            print(f"Epoch {epoch:3d} | TLoss:{tl:.4f} TAcc:{ta:.4f} | VLoss:{vl:.4f} VAcc:{va:.4f}")

        if vl < best_val_loss:
            best_val_loss, best_val_acc, no_improve = vl, va, 0
            torch.save({"model_state_dict": model.state_dict(), "epoch": epoch,
                         "val_loss": vl, "val_acc": va, "input_size": 10,
                         "model_type": "v2" if use_v2 else "v1"},
                        os.path.join(model_save_dir, f"{model_name}.pth"))
        else:
            no_improve += 1
            if no_improve >= patience:
                print(f"Early stopping at epoch {epoch}")
                break

    with open(os.path.join(model_save_dir, "training_history.json"), "w") as f:
        json.dump(history, f)
    print(f"Best Val Loss: {best_val_loss:.4f} | Best Val Acc: {best_val_acc:.4f}")
    return os.path.join(model_save_dir, f"{model_name}.pth"), history

if __name__ == "__main__":
    train_model()
