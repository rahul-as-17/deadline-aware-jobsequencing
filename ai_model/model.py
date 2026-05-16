"""
Neural Network Model for Job Scheduling
==========================================
A feedforward neural network that predicts whether a job
should be scheduled (priority score) based on its features.

Architecture:
    Input (10 features) → 128 → 64 → 32 → 1 (sigmoid)

Uses dropout for regularization and batch normalization
for training stability.
"""

import torch
import torch.nn as nn


class SchedulerNet(nn.Module):
    """
    Neural network model for predicting job scheduling priority.

    Takes 10 normalized features as input and outputs a probability
    (0-1) indicating how likely the job should be scheduled.
    """

    def __init__(self, input_size: int = 10, dropout_rate: float = 0.3):
        super(SchedulerNet, self).__init__()

        self.network = nn.Sequential(
            # Layer 1: Input → 128
            nn.Linear(input_size, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(dropout_rate),

            # Layer 2: 128 → 64
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(dropout_rate),

            # Layer 3: 64 → 32
            nn.Linear(64, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(dropout_rate * 0.5),

            # Output: 32 → 1
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

        # Initialize weights
        self._init_weights()

    def _init_weights(self):
        """Xavier initialization for better convergence."""
        for module in self.network:
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                nn.init.zeros_(module.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass.

        Args:
            x: Input tensor of shape (batch_size, 10)

        Returns:
            Output tensor of shape (batch_size, 1) with values in [0, 1]
        """
        return self.network(x)

    def predict_priority(self, x: torch.Tensor) -> torch.Tensor:
        """
        Get priority scores without gradient computation.

        Args:
            x: Input tensor of shape (batch_size, 10)

        Returns:
            Priority scores tensor of shape (batch_size,)
        """
        self.eval()
        with torch.no_grad():
            scores = self.forward(x).squeeze(-1)
        return scores


class SchedulerNetV2(nn.Module):
    """
    Enhanced version with residual connections for deeper learning.
    """

    def __init__(self, input_size: int = 10, dropout_rate: float = 0.25):
        super(SchedulerNetV2, self).__init__()

        self.input_proj = nn.Sequential(
            nn.Linear(input_size, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
        )

        # Residual block 1
        self.res_block1 = nn.Sequential(
            nn.Linear(64, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(64, 64),
            nn.BatchNorm1d(64),
        )
        self.relu1 = nn.ReLU()

        # Residual block 2
        self.res_block2 = nn.Sequential(
            nn.Linear(64, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(64, 64),
            nn.BatchNorm1d(64),
        )
        self.relu2 = nn.ReLU()

        # Output head
        self.output_head = nn.Sequential(
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Dropout(dropout_rate * 0.5),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

        self._init_weights()

    def _init_weights(self):
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                nn.init.zeros_(module.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h = self.input_proj(x)
        h = self.relu1(self.res_block1(h) + h)
        h = self.relu2(self.res_block2(h) + h)
        return self.output_head(h)

    def predict_priority(self, x: torch.Tensor) -> torch.Tensor:
        self.eval()
        with torch.no_grad():
            return self.forward(x).squeeze(-1)
