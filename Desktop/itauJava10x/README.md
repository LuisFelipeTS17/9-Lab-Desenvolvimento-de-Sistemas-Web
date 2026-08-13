# Itau Java 10x

Teste técnico baseado em uma vaga real do Itaú: uma API de **transações financeiras** que calcula **estatísticas** das transações recebidas nos últimos N segundos.

> ⚠️ **Status:** projeto em desenvolvimento. A modelagem inicial (`Transacao`) já existe; os endpoints ainda estão sendo implementados. Veja a seção [Status do desafio](#-status-do-desafio).

## 📋 Descrição

Aplicação Spring Boot que recebe transações e, a partir delas, expõe estatísticas em tempo real (soma, mínimo, máximo, média e quantidade) considerando apenas as transações de uma janela de tempo configurável. Os dados são mantidos **em memória** — não há banco de dados.

## ✅ Status do desafio

| Item | Situação |
|------|----------|
| Modelo `Transacao` (`valor`, `dataHora`) | ✔️ criado |
| `POST /transacao` | ⏳ pendente |
| `DELETE /transacao` | ⏳ pendente |
| `GET /estatistica` | ⏳ pendente |
| Janela de tempo configurável | ⏳ pendente |
| Testes | ⏳ pendente |

## 🔧 Pré-requisitos

- **Java 17** ou superior
- **Maven 3.6+** ou o Maven Wrapper incluído no projeto (`mvnw` / `mvnw.cmd`)
- **Git** (opcional, para clonar o repositório)

Verificando as instalações:

```bash
java -version
mvn -version
```

## 🏗️ Como buildar

### Usando o Maven Wrapper (recomendado)

O projeto inclui o Maven Wrapper, então não é necessário ter o Maven instalado globalmente.

**Linux/macOS:**

```bash
./mvnw clean install
```

**Windows:**

```powershell
.\mvnw.cmd clean install
```

### Usando o Maven instalado globalmente

```bash
mvn clean install
```

Esse comando irá limpar o diretório `target/`, compilar o código, executar os testes e gerar o JAR em `target/itauJava10x-0.0.1-SNAPSHOT.jar`.

Para compilar sem executar os testes:

```bash
./mvnw clean install -DskipTests
```

## 🚀 Como rodar

### Opção 1: via Maven (recomendado para desenvolvimento)

**Linux/macOS:**

```bash
./mvnw spring-boot:run
```

**Windows:**

```powershell
.\mvnw.cmd spring-boot:run
```

### Opção 2: via JAR gerado

Após o build:

```bash
java -jar target/itauJava10x-0.0.1-SNAPSHOT.jar
```

A aplicação sobe em **http://localhost:8080**.

## 🧪 Como testar

```bash
# Linux/macOS
./mvnw test

# Windows
.\mvnw.cmd test
```

Executando um teste específico:

```bash
./mvnw test -Dtest=ItauJava10xApplicationTests
```

Os relatórios ficam em `target/surefire-reports/` (formatos XML e TXT).

## 📡 Especificação da API

> A especificação abaixo descreve o **objetivo** do desafio. Os endpoints ainda estão sendo implementados (veja [Status do desafio](#-status-do-desafio)).

### `POST /transacao`

Adiciona uma nova transação.

```bash
curl -X POST http://localhost:8080/transacao \
  -H "Content-Type: application/json" \
  -d '{
    "valor": 100.50,
    "dataHora": "2024-01-15T10:30:00Z"
  }'
```

Respostas esperadas:

- **201 Created** — transação aceita
- **422 Unprocessable Entity** — JSON válido, mas com dados inválidos (ex.: transação no futuro, valor negativo)
- **400 Bad Request** — JSON malformado

### `DELETE /transacao`

Remove todas as transações armazenadas.

```bash
curl -X DELETE http://localhost:8080/transacao
```

Resposta esperada: **200 OK**

### `GET /estatistica`

Retorna as estatísticas das transações dentro da janela de tempo configurada.

```bash
curl http://localhost:8080/estatistica
```

```json
{
  "soma": 100.50,
  "min": 100.50,
  "max": 100.50,
  "media": 100.50,
  "quantidade": 1
}
```

Quando não há transações na janela, todos os campos retornam `0`.

## ⚙️ Configuração

As configurações ficam em `src/main/resources/application.properties`:

```properties
spring.application.name=itauJava10x
```

A janela de tempo das estatísticas será tornada configurável (padrão previsto: **60 segundos**), por exemplo:

```properties
# a implementar
estatistica.segundos=60
```

Para alterar a porta padrão, caso a 8080 esteja em uso:

```properties
server.port=8081
```

## 🛠️ Tecnologias utilizadas

- **Spring Boot 4.1.0** — framework principal
- **Java 17** — linguagem
- **Maven** — gerenciamento de dependências e build
- **Lombok** — redução de boilerplate
- **Spring Boot Test (JUnit 5)** — testes

## 📁 Estrutura do projeto

```
itauJava10x/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── dev/java10x/itauJava10x/
│   │   │       ├── Transacao.java              # modelo da transação
│   │   │       └── ItauJava10xApplication.java # classe principal
│   │   └── resources/
│   │       └── application.properties          # configurações
│   └── test/
│       └── java/
│           └── dev/java10x/itauJava10x/
│               └── ItauJava10xApplicationTests.java
├── pom.xml
└── README.md
```

## 🐛 Solução de problemas

**`Port 8080 already in use`** — a porta já está em uso. Pare o processo que a ocupa ou defina outra porta em `application.properties` (`server.port=8081`).

**Erro ao executar `./mvnw`** (Linux/macOS) — garanta permissão de execução:

```bash
chmod +x mvnw
```

## 📝 Notas

- As transações são mantidas **em memória** — não há persistência em banco de dados.
- As estatísticas consideram apenas as transações da janela de tempo configurada.
- Ao reiniciar a aplicação, todas as transações são perdidas.

## 📄 Licença

Projeto de teste técnico, sem fins comerciais.