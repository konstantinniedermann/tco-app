.DEFAULT_GOAL := help
.PHONY: help check secrets hooks

help: ## Diese Übersicht
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

check: ## Alle Prüfungen wie in der CI (vor jedem Commit)
	@bash scripts/check-docs.sh

secrets: ## Secret-Scan über die ganze Git-Historie (gitleaks)
	@gitleaks git --no-banner --redact --exit-code 1 .

hooks: ## Versionierte Git-Hooks aktivieren (Secret-Scan + Doku-Check, kein Push auf main)
	@git config core.hooksPath .githooks
	@echo "Git-Hooks aus .githooks/ aktiv."
