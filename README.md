# Medical Records App — Portfolio DevOps

Application de gestion de dossiers patients, conçue comme projet portfolio pour démontrer une chaîne DevOps complète : développement backend/frontend, conteneurisation, orchestration Kubernetes, Infrastructure as Code avec Terraform, CI/CD avec GitHub Actions, et observabilité.

> ⚠️ **Projet pédagogique** — aucune donnée patient réelle n'est utilisée. Toutes les données sont fictives et générées à des fins de démonstration.

## Objectif

Ce projet a pour but de montrer, de bout en bout, comment concevoir, déployer et opérer une application web sensible (données de santé) en suivant les bonnes pratiques DevOps modernes : conteneurisation, automatisation, infrastructure versionnée, pipelines CI/CD et supervision applicative.

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

## Stack technique

| Domaine | Technologie |
|---|---|
| Backend | Node.js, Express, node-postgres (SQL brut) |
| Frontend | React |
| Base de données | PostgreSQL |
| Authentification | JWT |
| Conteneurisation | Docker, Docker Compose |
| Orchestration | Kubernetes (Minikube en local, EKS en cible cloud) |
| Infrastructure as Code | Terraform |
| CI/CD | GitHub Actions |
| Observabilité | Prometheus, Grafana, Loki |

## Structure du repo

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

## Démarrage rapide (local)

Prérequis : Docker et Docker Compose installés.

```bash
git clone <url-du-repo>
cd medical-app
docker compose up --build
```

L'API sera disponible sur `http://localhost:3000`. Vérifier qu'elle répond :

```bash
curl http://localhost:3000/health
```

## Fonctionnalités de l'API

| Méthode | Endpoint | Description | Auth requise |
|---|---|---|---|
| GET | `/health` | Vérification de l'état du service | Non |
| GET | `/api/patients` | Liste des patients | Oui |
| GET | `/api/patients/:id` | Détail d'un patient | Oui |
| POST | `/api/patients` | Créer un patient | Oui |
| PUT | `/api/patients/:id` | Modifier un patient | Oui |
| DELETE | `/api/patients/:id` | Supprimer un patient | Oui |


## Ingress (NGINX)

### Mise en place

1. Activation de l'addon Ingress sur Minikube :
```bash
   minikube addons enable ingress
```

2. Manifeste `k8s/ingress.yaml` — routing path-based explicite :
   - `/api` → service `backend` (port 3000)
   - `/` → service `frontend` (port 80)

```yaml
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: medical-app-ingress
     namespace: medical-app
   spec:
     ingressClassName: nginx
     rules:
       - host: medical-app.local
         http:
           paths:
             - path: /api
               pathType: Prefix
               backend:
                 service:
                   name: backend
                   port:
                     number: 3000
             - path: /
               pathType: Prefix
               backend:
                 service:
                   name: frontend
                   port:
                     number: 80
```

3. Le proxy `/api` dans la config Nginx du frontend a été retiré : le routing `/api` est désormais géré entièrement par l'Ingress, plus par le reverse proxy interne du conteneur frontend.

### Accès en local (WSL2 + driver Docker)

Avec Minikube en driver `docker` sous WSL2, l'IP du cluster (`minikube ip`) n'est pas routable directement depuis l'hôte WSL2 (`ping` et `curl` vers cette IP timeout, y compris sur les NodePort). Solution retenue : `kubectl port-forward` vers le service du contrôleur Ingress.

```bash
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8081:80
```

Puis dans un autre terminal :

```bash
curl -H "Host: medical-app.local" http://localhost:8081/
curl -H "Host: medical-app.local" http://localhost:8081/api/patients
```

- `/` → renvoie le HTML du frontend React
- `/api/patients` → renvoie `{"error":"Token manquant"}` (comportement attendu sans JWT, prouve que le routing atteint bien le backend)

Alternative non testée pour un accès plus direct (sans port-forward) : `minikube tunnel`.

## Roadmap du projet

- [x] API backend (CRUD patients, validation, auth JWT)
- [x] Conteneurisation Docker + Docker Compose (environnement local)
- [ ] Route d'authentification (login)
- [ ] Frontend React
- [ ] Déploiement Kubernetes (Minikube)
- [ ] Infrastructure cloud avec Terraform
- [ ] Pipeline CI/CD (GitHub Actions)
- [ ] Observabilité (Prometheus, Grafana, Loki)

## Licence

Projet à but pédagogique / portfolio.
