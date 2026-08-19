# Kubernetes Configuration

Detailed Kubernetes configuration for the project: exposure (Ingress), resource management, autoscaling, network security, and resilience.

## Ingress (NGINX)

### Setup

1. Enable the Ingress addon on Minikube:
```bash
minikube addons enable ingress
```

2. `k8s/ingress.yaml` manifest — explicit path-based routing:
   - `/api` → `backend` service (port 3000)
   - `/` → `frontend` service (port 80)

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

3. The `/api` proxy in the frontend's Nginx config was removed: `/api` routing is now handled entirely by the Ingress, rather than the frontend container's internal reverse proxy.

### Local access (WSL2 + Docker driver)

With Minikube using the `docker` driver under WSL2, the cluster IP (`minikube ip`) is not directly routable from the WSL2 host (`ping` and `curl` against it time out, even on NodePorts). Solution used: `kubectl port-forward` to the Ingress controller service.

```bash
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8081:80
```

Then, in another terminal:

```bash
curl -H "Host: medical-app.local" http://localhost:8081/
curl -H "Host: medical-app.local" http://localhost:8081/api/patients
```

- `/` → returns the React frontend HTML
- `/api/patients` → returns `{"error":"Token manquant"}` (expected behavior without a JWT, proves routing reaches the backend)

Untested alternative for more direct access (without port-forward): `minikube tunnel`.

## Resource requests & limits

### Why

Without `requests`/`limits`, a pod can consume all available node resources and affect other pods. `requests` guarantee a reserved minimum (used by the scheduler to place the pod); `limits` set a hard ceiling (throttling for CPU, `OOMKilled` for memory when exceeded).

### Methodology

Values calibrated from real measurements rather than guessed blindly:

```bash
kubectl top pods -n medical-app
```

Observed consumption at rest (pods with no traffic):

| Pod | CPU | Memory |
|---|---|---|
| backend | 2m | 87Mi |
| frontend | 1m | 4Mi |
| postgres | 7m | 43Mi |

A 5x–10x margin was applied on top of these at-rest values to absorb load spikes (concurrent requests, bcrypt hashing on the backend, connections/queries on Postgres).

### Values used

| Service | CPU request | CPU limit | Memory request | Memory limit |
|---|---|---|---|---|
| backend | 50m | 250m | 128Mi | 256Mi |
| frontend | 10m | 100m | 32Mi | 64Mi |
| postgres | 100m | 500m | 128Mi | 256Mi |

### Verification

```bash
kubectl describe pod -n medical-app -l app=<name> | grep -A 6 "Limits\|Requests"
```

## Horizontal Pod Autoscaler (HPA)

### Setup

`k8s/backend-hpa.yaml` — CPU-based autoscaling for the backend, targeting 50% utilization relative to the defined `request` (50m):

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

Requirements: metrics-server (already active via the Minikube addon) and `resources.requests.cpu` defined on the target Deployment.

### Load test

```bash
kubectl run -n medical-app load-generator --image=busybox --restart=Never -- /bin/sh -c "while true; do wget -q -O- http://backend:3000/health; done"
```

Observed results (`kubectl get hpa -n medical-app -w`):

| Phase | CPU / target | Replicas |
|---|---|---|
| At rest | 4%/50% | 1 |
| Load spike | 450%/50% | 1 → 4 (near-instant) |
| Sustained load (spread across 4 pods) | ~150%/50% | 4 |
| After removing load-generator | 2-4%/50% | back to 1 (after ~5 min stabilization window by default) |

Scale-down is intentionally slower than scale-up, to avoid oscillation if load spikes again shortly after a temporary drop.

## NetworkPolicies

### Requirements

Minikube's default CNI (Kindnet) does not support NetworkPolicies. The cluster was recreated under a dedicated profile with Calico:

```bash
minikube start -p medical-app-cluster --cni calico
```

(separate profile to avoid impacting other projects running on the default Minikube profile)

### Strategy: deny-by-default + explicit allow

- `default-deny-ingress` — blocks all inbound traffic not explicitly allowed, within the `medical-app` namespace
- `allow-ingress-to-frontend` / `allow-ingress-to-backend` — allow inbound traffic from the `ingress-nginx` namespace
- `allow-frontend-to-backend` — frontend can call backend on port 3000
- `allow-backend-to-postgres` — only backend can call postgres on port 5432
- `allow-dns` — DNS resolution allowed for all pods

### Validation

| Test | Expected result | Observed result |
|---|---|---|
| Ingress → frontend/backend | Works | ✅ HTML + API response |
| backend → postgres | Works | ✅ `/health` → `{"status":"ok"}`, `/api/patients` → 401 (auth reached, so DB is fine) |
| frontend → postgres (direct) | Blocked | ✅ Timeout confirmed |

Key point: even though `frontend` knows the `postgres` service address (cluster-internal DNS resolution), Calico blocks the network connection at the CNI level — security doesn't rely on obscuring a service name.

## PodDisruptionBudget (PDB)

### Purpose

Guarantee a minimum level of backend availability during *voluntary* disruptions (node drain, maintenance) — does not protect against involuntary crashes (OOMKilled, etc.).

### Configuration

`k8s/backend-pdb.yaml`:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: backend-pdb
  namespace: medical-app
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: backend
```

`minAvailable: 1` was chosen over `maxUnavailable`, since the backend can scale down to a single replica via the HPA (`minReplicas: 1`) — a `maxUnavailable` setting would not have prevented eviction of the last remaining pod in that case.

### Validation

Direct eviction test via the Kubernetes API (`POST /eviction`) on the backend pod while only one replica was active:

HTTP 429 Too Many Requests
"Cannot evict pod as it would violate the pod's disruption budget."
"The disruption budget backend-pdb needs 1 healthy pods and has 1 currently"

The PDB blocked the eviction as expected, confirming protection against losing the last backend pod during a planned maintenance 
operation.
