#!/usr/bin/env bash
# Fails if any AI SDK, model API or AI key appears in the project.
# ProofFlow must have no AI inside: the customer's own Claude does the thinking.
set -euo pipefail

PATTERN='"openai"|openai/|@anthropic-ai|"ai":|@ai-sdk|langchain|llamaindex|cohere-ai|@mistralai|@google/generative-ai|@google/genai|groq-sdk|replicate|OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY|sk-ant-|sk-proj-'

if grep -RInE "$PATTERN" . \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git --exclude-dir=.vercel \
  --exclude=check-no-ai.sh --exclude=CLAUDE.md --exclude=SPEC.md --exclude=README.md; then
  echo ""
  echo "FAIL: AI dependency or key found above. ProofFlow must have no AI inside."
  exit 1
fi

echo "OK: no AI SDKs or keys found."
