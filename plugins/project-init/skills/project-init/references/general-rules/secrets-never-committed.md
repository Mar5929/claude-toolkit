# Secrets Never Touch Git

API keys and credentials live outside the repo (environment, keychain, or a
secret store). Never commit them. Respect `.gitignore`. If a secret would need
to be committed for something to work, stop and raise it with the owner.
