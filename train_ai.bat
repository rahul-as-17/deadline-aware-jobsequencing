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
python run_training.py

echo.
echo Training complete! Restart the backend to load the model.
pause
