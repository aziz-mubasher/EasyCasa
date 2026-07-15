# VPS Setup & Hardening (Phase 0, Step 1)

Run on your **Hostinger VPS** (not on your Mac). Cloning to `/opt/easycasa` on a local machine will fail with `Permission denied`.

## Find your VPS (Hostinger CLI)

Install the CLI (macOS):

```bash
curl -sL https://github.com/hostinger/api-cli/releases/download/v3.5.0/hostinger-3.5.0-darwin-arm64.tar.gz \
  | tar -xz -C ~/.local/bin hostinger
export PATH="$HOME/.local/bin:$PATH"
# Token: hPanel → Profile → API, or reuse HOSTINGER_API_TOKEN
hostinger vps virtual-machines list
```

SSH as root (replace with your VPS IP from the list above):

```bash
ssh root@<VPS_IP>
```

## Clone the repo (on the VPS)

The GitHub repo is **private**, so `git clone https://...` on the VPS will fail unless you add a deploy key.
Options:

1. **Deploy key (recommended for CI/deploy)** — generate on the VPS, add the public key in GitHub → repo → Settings → Deploy keys.
2. **Rsync from your Mac** (one-time bootstrap):

```bash
rsync -avz --exclude node_modules --exclude .next --exclude dist --exclude services/ai/.venv \
  "/path/to/Easy Casa Platform/" root@<VPS_IP>:/opt/easycasa/
ssh root@<VPS_IP> 'cd /opt/easycasa && cp .env.example .env && chmod +x infra/deploy.sh infra/backup.sh'
```

Run as root on a fresh Ubuntu 22.04/24.04 VPS. Do prod and staging on separate nodes.

## 1. Create a deploy user
```bash
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
# paste your public key:
nano /home/deploy/.ssh/authorized_keys
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

## 2. Harden SSH
Edit `/etc/ssh/sshd_config`:
```
PermitRootLogin no
PasswordAuthentication no
```
Then: `systemctl restart ssh`

## 3. Firewall
```bash
apt update && apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 4. Automatic security updates + fail2ban
```bash
apt install -y unattended-upgrades fail2ban
dpkg-reconfigure -plow unattended-upgrades
systemctl enable --now fail2ban
```

## 5. Install Docker + Compose plugin
```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
```

## 6. Clone the repo
```bash
sudo mkdir -p /opt/easycasa && sudo chown deploy:deploy /opt/easycasa
su - deploy
cd /opt/easycasa
git clone git@github.com:aziz-mubasher/EasyCasa.git .
cp .env.example .env   # then edit .env with real secrets
```

> **Traefik (shared VPS):** If ports 80/443 are already used by Traefik, `deploy.sh` auto-detects the `root_default` network and applies `infra/docker-compose.traefik.yml` instead of Caddy. Set `STAGING_DOMAIN=easycasaita.com` in `.env` and point the apex (+ optional `www`) A records at the VPS IP.

## 7. First deploy
```bash
# Set STAGING_DOMAIN in .env (e.g. easycasaita.com)
./infra/deploy.sh
```
Traefik issues TLS via the existing `mytlschallenge` resolver; Caddy is skipped automatically.

## 8. Schedule backups
```bash
crontab -e
# nightly at 02:30
30 2 * * * /opt/easycasa/infra/backup.sh >> /opt/easycasa/backups/backup.log 2>&1
```
