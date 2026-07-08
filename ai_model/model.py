"""
Neural Network Model for Job Scheduling
==========================================
A feedforward neural network that predicts whether a job
should be scheduled (priority score) based on its features.

V1 Architecture:
    Input (22 features) → 128 → 64 → 32 → 1

V2 Architecture (Residual):
    Input → 128 → [ResBlock 128] × 3 → 64 → 32 → 1

Uses dropout for regularization and batch normalization
for training stability. Outputs raw logits (no sigmoid) so
BCEWithLogitsLoss can be used for numerically stable training.
Sigmoid is applied only at inference time in predict_priority().
"""

import torch
import torch.nn as nn


class SchedulerNet(nn.Module):
    """
    Neural network model for predicting job scheduling priority.

    Takes 22 normalized features as input and outputs a raw logit
    score. Sigmoid is applied at inference time only.
    """

    def __init__(self, input_size: int = 22, dropout_rate: float = 0.3):
        super(SchedulerNet, self).__init__()

        self.network = nn.Sequential(
            # Layer 1: Input → 128
            nn.Linear(input_size, 128),
            nn.BatchNorm1d(128),
            nn.GELU(),
            nn.Dropout(dropout_rate),

            # Layer 2: 128 → 64
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Dropout(dropout_rate),

            # Layer 3: 64 → 32
            nn.Linear(64, 32),
            nn.BatchNorm1d(32),
            nn.GELU(),
            nn.Dropout(dropout_rate * 0.5),

            # Output: 32 → 1 (raw logit, no sigmoid)
            nn.Linear(32, 1),
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
        Forward pass. Returns raw logits (no sigmoid).

        Args:
            x: Input tensor of shape (batch_size, 22)

        Returns:
            Output tensor of shape (batch_size, 1) with raw logit values
        """
        return self.network(x)

    def predict_priority(self, x: torch.Tensor) -> torch.Tensor:
        """
        Get priority scores without gradient computation.
        Applies sigmoid to convert logits to probabilities.

        Args:
            x: Input tensor of shape (batch_size, 22)

        Returns:
            Priority scores tensor of shape (batch_size,) in [0, 1]
        """
        self.eval()
        with torch.no_grad():
            scores = torch.sigmoid(self.forward(x)).squeeze(-1)
        return scores


class SchedulerNetV2(nn.Module):
    """
    Enhanced version with residual connections, wider layers,
    GELU activation, and 3 residual blocks for deeper learning.
    """

    def __init__(self, input_size: int = 22, dropout_rate: float = 0.35):
        super(SchedulerNetV2, self).__init__()

        self.input_proj = nn.Sequential(
            nn.Linear(input_size, 128),
            nn.BatchNorm1d(128),
            nn.GELU(),
        )

        # Residual block 1
        self.res_block1 = nn.Sequential(
            nn.Linear(128, 128),
            nn.BatchNorm1d(128),
            nn.GELU(),
            nn.Dropout(dropout_rate),
            nn.Linear(128, 128),
            nn.BatchNorm1d(128),
        )
        self.act1 = nn.GELU()

        # Residual block 2
        self.res_block2 = nn.Sequential(
            nn.Linear(128, 128),
            nn.BatchNorm1d(128),
            nn.GELU(),
            nn.Dropout(dropout_rate),
            nn.Linear(128, 128),
            nn.BatchNorm1d(128),
        )
        self.act2 = nn.GELU()

        # Residual block 3
        self.res_block3 = nn.Sequential(
            nn.Linear(128, 128),
            nn.BatchNorm1d(128),
            nn.GELU(),
            nn.Dropout(dropout_rate),
            nn.Linear(128, 128),
            nn.BatchNorm1d(128),
        )
        self.act3 = nn.GELU()

        # Output head (raw logit, no sigmoid)
        self.output_head = nn.Sequential(
            nn.Linear(128, 64),
            nn.GELU(),
            nn.Dropout(dropout_rate * 0.5),
            nn.Linear(64, 32),
            nn.GELU(),
            nn.Linear(32, 1),
        )

        self._init_weights()

    def _init_weights(self):
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                nn.init.zeros_(module.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Returns raw logits (no sigmoid)."""
        h = self.input_proj(x)
        h = self.act1(self.res_block1(h) + h)
        h = self.act2(self.res_block2(h) + h)
        h = self.act3(self.res_block3(h) + h)
        return self.output_head(h)

    def predict_priority(self, x: torch.Tensor) -> torch.Tensor:
        """Applies sigmoid at inference time to get [0, 1] priority scores."""
        self.eval()
        with torch.no_grad():
            return torch.sigmoid(self.forward(x)).squeeze(-1)
