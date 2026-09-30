import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, FontSizes, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Player = "X" | "O";
type Cell = Player | null;

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const EMPTY_BOARD: Cell[] = Array(9).fill(null);

function getWinner(board: Cell[]): { player: Player; line: number[] } | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a]!, line };
    }
  }
  return null;
}

export function TicTacToe() {
  const theme = useTheme();
  const [board, setBoard] = useState<Cell[]>(EMPTY_BOARD);
  const [currentPlayer, setCurrentPlayer] = useState<Player>("X");

  const winner = getWinner(board);
  const isDraw = !winner && board.every((cell) => cell !== null);
  const isGameOver = Boolean(winner) || isDraw;

  function handlePress(index: number) {
    if (board[index] || isGameOver) {
      return;
    }
    const nextBoard = [...board];
    nextBoard[index] = currentPlayer;
    setBoard(nextBoard);
    if (!getWinner(nextBoard)) {
      setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
    }
  }

  function resetGame() {
    setBoard(EMPTY_BOARD);
    setCurrentPlayer("X");
  }

  const status = winner
    ? `Joueur ${winner.player} a gagné ! 🎉`
    : isDraw
      ? "Match nul !"
      : `Au tour du joueur ${currentPlayer}`;

  return (
    <ThemedView style={styles.game}>
      <ThemedText type="subtitle" style={styles.status}>
        {status}
      </ThemedText>

      <ThemedView type="backgroundElement" style={styles.board}>
        {[0, 1, 2].map((row) => (
          <ThemedView key={row} style={styles.row}>
            {[0, 1, 2].map((column) => {
              const index = row * 3 + column;
              const cell = board[index];
              const isWinningCell = winner?.line.includes(index) ?? false;
              return (
                <Pressable
                  key={index}
                  accessibilityLabel={`Case ${index + 1}${cell ? `, ${cell}` : ""}`}
                  onPress={() => handlePress(index)}
                  style={({ pressed }) => [
                    styles.cell,
                    {
                      backgroundColor: isWinningCell ? theme.backgroundSelected : theme.background,
                      borderColor: theme.border,
                    },
                    pressed && styles.cellPressed,
                  ]}
                >
                  {cell && (
                    <ThemedText
                      style={[
                        styles.mark,
                        { color: cell === "X" ? theme.primary : theme.secondary },
                      ]}
                    >
                      {cell}
                    </ThemedText>
                  )}
                </Pressable>
              );
            })}
          </ThemedView>
        ))}
      </ThemedView>

      <Pressable
        onPress={resetGame}
        style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
      >
        <ThemedText type="smallBold" themeColor="onPrimary">
          Nouvelle partie
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  game: {
    alignItems: "center",
    gap: Spacing.four,
    width: "100%",
  },
  status: {
    textAlign: "center",
  },
  board: {
    width: "100%",
    maxWidth: 320,
    borderRadius: Radius.lg,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: Radius.md,
  },
  cellPressed: {
    opacity: 0.7,
  },
  mark: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
  },
  resetButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + Spacing.one,
    borderRadius: Radius.md,
  },
  resetButtonPressed: {
    opacity: 0.8,
  },
});
