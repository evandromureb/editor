.PHONY: help install discover build lint lint-fix test dev demo preview fix clean distclean

PORT ?= 3000
export PORT

help:
	@echo "BaseLab Editor — alvos disponíveis:"
	@echo ""
	@echo "  make install   Instala dependências (npm install)"
	@echo "  make discover  Gera src/generated/ (plugins, temas, i18n, CSS)"
	@echo "  make build     discover + bundle dist/"
	@echo "  make lint      ESLint"
	@echo "  make test      Suite de testes"
	@echo "  make fix       testes + lint + typecheck + build + validação dist"
	@echo "  make dev       test + lint + build + servidor HTTP na porta $(PORT)"
	@echo "  make demo      alias para make dev (abre /demo/)"
	@echo "  make preview   build + abre dist/embed.html na porta $(PORT)"
	@echo "  make clean     Remove dist/ e src/generated/"
	@echo "  make distclean clean + remove node_modules/"
	@echo ""
	@echo "  Demo:    http://localhost:$(PORT)/demo/"
	@echo "  Embed:   http://localhost:$(PORT)/dist/embed.html (após make build)"

install:
	npm install

discover:
	node scripts/discover.js

build: discover
	npm run build

fix:
	npm run prepush

lint:
	npm run lint

lint-fix:
	npm run lint -- --fix

test:
	npm run test

# Ordem fixa: test → lint → build → servidor (falha em qualquer etapa aborta o resto)
dev:
	$(MAKE) test
	$(MAKE) lint
	$(MAKE) build
	@echo "Abrindo demo em http://localhost:$(PORT)/demo/"
	npm run dev

demo: dev

preview: build
	@echo "Preview do bundle: http://localhost:$(PORT)/dist/embed.html"
	@PORT=$(PORT) node scripts/dev-server.js

clean:
	rm -rf dist src/generated

distclean: clean
	rm -rf node_modules
