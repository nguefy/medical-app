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

## Resource requests & limits

### Pourquoi

Sans `requests`/`limits`, un pod peut consommer toutes les ressources disponibles sur le nœud et affecter les autres pods. Les `requests` garantissent un minimum réservé (utilisé par le scheduler pour placer le pod) ; les `limits` fixent un plafond (throttling pour le CPU, `OOMKilled` pour la mémoire en cas de dépassement).

### Méthodologie

Valeurs calibrées à partir d'une mesure réelle plutôt que devinées à l'aveugle :

```bash
kubectl top pods -n medical-app
```

Consommation observée au repos (pods sans trafic) :

| Pod | CPU | Mémoire |
|---|---|---|
| backend | 2m | 87Mi |
| frontend | 1m | 4Mi |
| postgres | 7m | 43Mi |

Une marge x5 à x10 a été appliquée sur ces valeurs de repos pour absorber les pics de charge (requêtes simultanées, hashing bcrypt côté backend, connexions/requêtes côté Postgres).

### Valeurs retenues

| Service | CPU request | CPU limit | Mémoire request | Mémoire limit |
|---|---|---|---|---|
| backend | 50m | 250m | 128Mi | 256Mi |
| frontend | 10m | 100m | 32Mi | 64Mi |
| postgres | 100m | 500m | 128Mi | 256Mi |

### Vérification

```bash
kubectl describe pod -n medical-app -l app=<nom> | grep -A 6 "Limits\|Requests"
```

Confirme que les valeurs appliquées via `kubectl apply -f k8s/<service>-deployment.yaml` correspondent bien à celles définies dans le manifeste.

## Horizontal Pod Autoscaler (HPA)

### Mise en place

`k8s/backend-hpa.yaml` — autoscaling du backend basé sur le CPU, cible 50% d'utilisation par rapport à la `request` définie (50m) :

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: medical-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 1
  maxReplicas: 4
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 50
```

Prérequis : metrics-server (déjà actif via l'addon Minikube) et des `resources.requests.cpu` définies sur le Deployment cible — le HPA calcule son pourcentage par rapport à cette valeur.

### Test de charge

Charge simulée avec un pod temporaire spammant `/health` en boucle :

```bash
kubectl run -n medical-app load-generator --image=busybox --restart=Never -- /bin/sh -c "while true; do wget -q -O- http://backend:3000/health; done"
```

Résultats observés (`kubectl get hpa -n medical-app -w`) :

| Phase | CPU / cible | Replicas |
|---|---|---|
| Repos | 4%/50% | 1 |
| Pic de charge | 450%/50% | 1 → 4 (quasi instantané) |
| Charge soutenue (répartie sur 4 pods) | ~150%/50% | 4 |
| Après suppression du load-generator | 2-4%/50% | retour à 1 (après fenêtre de stabilisation, ~5 min par défaut) |

Le scale down est volontairement plus lent que le scale up, pour éviter les oscillations si la charge remonte rapidement après une baisse temporaire.

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
