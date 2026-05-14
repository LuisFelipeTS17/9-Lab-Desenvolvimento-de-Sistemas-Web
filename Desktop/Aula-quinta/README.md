# carstore-spring-boot

Aplicação web de gerenciamento de carros construída com **Spring Boot 3 + Java 21**, que combina duas camadas de segurança distintas usando Spring Security e JWT.

## Sobre o projeto

A aplicação possui duas camadas de acesso:

- **Camada Web (stateful)** — interface Thymeleaf protegida por login com formulário e sessão no servidor
- **Camada de API REST (stateless)** — endpoints JSON protegidos por JWT, sem sessão, consumível via Postman ou qualquer cliente HTTP

## Tecnologias

- Java 21
- Spring Boot 3.2
- Spring Security 6
- JJWT 0.11.5
- Thymeleaf

## Como rodar

```bash
cd carstore-spring-boot
mvn spring-boot:run
```

A aplicação sobe em `http://localhost:8080`.

## Usuários disponíveis

| Usuário | Senha | Role |
|---------|-------|------|
| admin   | admin | ADMIN, USER |
| user    | user  | USER |

## Testando a API com Postman

### 1. Obter token JWT

**POST** `http://localhost:8080/api/auth/login`

```json
{
  "username": "admin",
  "password": "admin"
}
```

Resposta: string JWT — copie e use nas próximas requisições.

### 2. Acessar rota protegida sem token

**GET** `http://localhost:8080/api/admin/cars`

Resposta esperada: `401 Unauthorized`

### 3. Acessar rota protegida com token

**GET** `http://localhost:8080/api/admin/cars`

Header:
```
Authorization: Bearer <TOKEN>
```

Resposta esperada: `200 OK` com lista de carros.

## Estrutura do projeto

```
carstore-spring-boot/
└── src/main/java/br/com/carstore/
    ├── CarstoreApplication.java
    ├── api/
    │   ├── AuthController.java       # POST /api/auth/login
    │   └── CarApiController.java     # GET /api/admin/cars
    ├── config/
    │   ├── JwtRequestFilter.java     # Filtro que valida o token em cada requisição
    │   └── SecurityConfig.java       # Duas cadeias: API (stateless) + Web (sessão)
    ├── controller/
    │   └── WebController.java
    ├── dto/
    │   └── LoginRequest.java
    └── service/
        └── JwtTokenService.java      # Geração e validação de JWT
```
