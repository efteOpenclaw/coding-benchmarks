#!/bin/bash
# Extract token usage from Claude Code session logs
# Usage: bash /app/scripts/extract-tokens.sh [workspace_path]
# If no path given, scans all /home/* workspaces

extract_from_workspace() {
  local ws="$1"
  local name=$(basename "$ws")

  for jsonl in "$ws"/.claude/projects/*/????????-????-????-????-????????????.jsonl; do
    [ -f "$jsonl" ] || continue
    local session_id=$(basename "$jsonl" .jsonl)
    local size=$(du -h "$jsonl" 2>/dev/null | cut -f1)

    # Sum all input_tokens and output_tokens from usage blocks
    local totals=$(grep -o '"usage":{[^}]*}' "$jsonl" 2>/dev/null | \
      grep -o '"input_tokens":[0-9]*\|"output_tokens":[0-9]*' | \
      awk -F: '
        /input_tokens/ {input += $2}
        /output_tokens/ {output += $2}
        END {printf "%d|%d", input, output}
      ')

    local input_tokens=$(echo "$totals" | cut -d'|' -f1)
    local output_tokens=$(echo "$totals" | cut -d'|' -f2)

    # Get model from last occurrence
    local model=$(grep -o '"model":"[^"]*"' "$jsonl" 2>/dev/null | tail -1 | sed 's/"model":"//;s/"//')

    # Calculate approximate cost (Kimi via Ollama = $0, Claude models have costs)
    local cost="local"
    case "$model" in
      claude-opus*) cost=$(echo "$input_tokens $output_tokens" | awk '{printf "%.2f", ($1*0.015 + $2*0.075)/1000}') ;;
      claude-sonnet*) cost=$(echo "$input_tokens $output_tokens" | awk '{printf "%.2f", ($1*0.003 + $2*0.015)/1000}') ;;
      claude-haiku*) cost=$(echo "$input_tokens $output_tokens" | awk '{printf "%.2f", ($1*0.0008 + $2*0.004)/1000}') ;;
    esac

    echo "$name|$session_id|${model:-unknown}|$input_tokens|$output_tokens|$cost|$size"
  done
}

# Header
printf "%-25s %-12s %12s %12s %8s %6s\n" "WORKSPACE" "MODEL" "INPUT_TOK" "OUTPUT_TOK" "COST" "LOG"
printf "%-25s %-12s %12s %12s %8s %6s\n" "─────────" "─────" "─────────" "──────────" "────" "───"

if [ -n "$1" ]; then
  extract_from_workspace "$1" | while IFS='|' read name sid model input output cost size; do
    printf "%-25s %-12s %12s %12s %8s %6s\n" "$name" "$model" "$input" "$output" "$cost" "$size"
  done
else
  for ws in /home/kimi-* /home/opus-* /home/mixed-* /home/haiku-*; do
    [ -d "$ws/.claude" ] || continue
    extract_from_workspace "$ws"
  done | sort -t'|' -k4 -rn | while IFS='|' read name sid model input output cost size; do
    printf "%-25s %-12s %12s %12s %8s %6s\n" "$name" "$model" "$input" "$output" "$cost" "$size"
  done
fi
