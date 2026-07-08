import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 50)
print("  Step 1: Generating Training Data")
print("=" * 50)
from ai_model.dataset_generator import generate_training_data
path, rows = generate_training_data(n_samples=2000, min_jobs=4, max_jobs=8, max_deadline=10)
print("Done: %d rows saved to %s" % (rows, path))

print()
print("=" * 50)
print("  Step 2: Training AI Model")
print("=" * 50)
from ai_model.train_model import train_model
model_path, history = train_model(data_path=path, epochs=100, batch_size=64, lr=0.001)

print()
print("=" * 50)
print("  Training Complete!")
print("=" * 50)
print("  Model saved : %s" % model_path)
print("  Final Train Acc : %.1f%%" % (history["train_acc"][-1] * 100))
print("  Final Val   Acc : %.1f%%" % (history["val_acc"][-1] * 100))
print("  Best Val Loss   : %.4f" % min(history["val_loss"]))
print()
print("Restart the backend to load the trained model.")
