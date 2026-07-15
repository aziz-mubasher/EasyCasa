# VPS Setup & Hardening (Phase 0, Step 1)

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
git clone <YOUR_REPO_URL> .
cp .env.example .env   # then edit .env with real secrets
```

## 7. First deploy
```bash
./infra/deploy.sh
```
Point your staging DNS A-record at the VPS IP; Caddy will provision TLS automatically.

## 8. Schedule backups
```bash
crontab -e
# nightly at 02:30
30 2 * * * /opt/easycasa/infra/backup.sh >> /opt/easycasa/backups/backup.log 2>&1
```
