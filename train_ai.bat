@echo off
echo ============================================================
echo   Generating Training Data + Training AI Model
echo ============================================================
echo.
echo This will:
echo   1. Generate 2000 random job combinations
echo   2. Solve each with brute-force (optimal labels)
echo   3. Train a PyTorch neural network for 100 epochs
echo   4. Save model to ai_model/saved_models/scheduler_model.pth
echo.
echo Estimated time: 2-5 minutes depending on your machine.
echo.

cd /d %~dp0
python -c "from ai_model.dataset_generator import generate_training_data; from ai_model.train_model import train_model; print('=== Generating Data ==='); path, rows = generate_training_data(n_samples=2000); print('=== Training Model ==='); train_model(data_path=path, epochs=100)"

echo.
echo Training complete! Restart the backend to load the model.
pause
