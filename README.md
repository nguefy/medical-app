# Medical Records App — DevOps Portfolio Project

Patient records management application, built as a portfolio project to demonstrate a complete DevOps chain: backend/frontend development, containerization, Kubernetes orchestration, Infrastructure as Code with Terraform, CI/CD with GitHub Actions, and observability.

> ⚠️ **Educational project** — no real patient data is used. All data is fictional and generated for demonstration purposes.

## Goal

This project aims to show, end to end, how to design, deploy, and operate a sensitive web application (health data) following modern DevOps best practices: containerization, automation, infrastructure as code, CI/CD pipelines, and application monitoring.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │ ───▶ │   Backend    │ ───▶ │  PostgreSQL  │
│   (React)    │      │ (Node/Express)│      │              │
└─────────────┘      └──────────────┘      └──────────────┘
        │                     │
        └─────────┬───────────┘
                   ▼
          Kubernetes (Minikube / EKS)
                   │
                   ▼
        Terraform (provisioning infra)
                   │
                   ▼
   Prometheus / Grafana / Loki (observabilité)
```

## Tech stack

| Domain | Technology |
|---|---|
| Backend | Node.js, Express, node-postgres (raw SQL) |
| Frontend | React |
| Database | PostgreSQL |
| Authentication | JWT |
| Containerization | Docker, Docker Compose |
| Orchestration | Kubernetes (Minikube locally, EKS as cloud target) |
| Infrastructure as Code | Terraform |
| CI/CD | GitHub Actions |
| Observability | Prometheus, Grafana, Loki |

## Repository structure

```
medical-app/
├── app/
│   ├── backend/      # API REST Node.js/Express
│   └── frontend/     # Interface React
├── infra/            # Terraform (provisioning cloud)
├── k8s/               # Manifests Kubernetes
├── .github/workflows/ # Pipelines CI/CD
└── docker-compose.yml # Environnement de dev local
```


## Quick start (local)

Prerequisites: Docker and Docker Compose installed.

```bash
git clone <repo-url>
cd medical-app
docker compose up --build
```

The API will be available at `http://localhost:3000`. Check it's responding:

```bash
curl http://localhost:3000/health
```

## API features

| Method | Endpoint | Description | Auth required |
|---|---|---|---|
| GET | `/health` | Service health check | No |
| GET | `/api/patients` | List patients | Yes |
| GET | `/api/patients/:id` | Patient details | Yes |
| POST | `/api/patients` | Create a patient | Yes |
| PUT | `/api/patients/:id` | Update a patient | Yes |
| DELETE | `/api/patients/:id` | Delete a patient | Yes |

## Kubernetes configuration

The Kubernetes deployment includes: exposure via Ingress (path-based routing), resource requests/limits calibrated from real measurements, autoscaling (HPA) tested under load, NetworkPolicies (deny-by-default with Calico), and a PodDisruptionBudget for resilience.

📄 Full details, manifests, and test results: [docs/kubernetes.md](docs/kubernetes.md)

## Project roadmap

- [x] Backend API (patient CRUD, validation, JWT auth)
- [x] Docker containerization + Docker Compose (local environment)
- [ ] Authentication route (login)
- [ ] React frontend
- [ ] Kubernetes deployment (Minikube)
- [ ] Cloud infrastructure with Terraform
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Observability (Prometheus, Grafana, Loki)

## License

Educational / portfolio project.
