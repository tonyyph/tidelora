#!/bin/sh
# Every eas invocation in package.json routes through here.
#
# eas-cli picks its Apple authentication mode from the environment: with
# EXPO_ASC_API_KEY_PATH, EXPO_ASC_KEY_ID and EXPO_ASC_ISSUER_ID set it talks to
# Apple with an App Store Connect API key, and without them it falls back to an
# Apple ID password plus a 2FA code sent by SMS. Apple's SMS service fails often
# enough that it cannot sit in the middle of a release, so the fallback is
# something to stay out of rather than something to retry.
#
# Sourcing lives here rather than in each script because forgetting it does not
# fail loudly. It silently takes the password path instead.
set -e

if [ -f .env.eas ]; then
  set -a
  . ./.env.eas
  set +a
fi

# eas reads the key relative to its own working directory, so anchor a relative
# path to the project root before handing it over.
case "${EXPO_ASC_API_KEY_PATH:-}" in
  '' | /*) ;;
  *) EXPO_ASC_API_KEY_PATH="$PWD/$EXPO_ASC_API_KEY_PATH"; export EXPO_ASC_API_KEY_PATH ;;
esac

# A half-filled key is worse than no key. eas-cli switches to API-key mode on the
# mere presence of any one of the three, so a named-but-missing .p8 turns what
# should be a fallback into a hard failure. Drop back deliberately instead.
if [ -n "${EXPO_ASC_API_KEY_PATH:-}${EXPO_ASC_KEY_ID:-}${EXPO_ASC_ISSUER_ID:-}" ]; then
  if [ ! -f "${EXPO_ASC_API_KEY_PATH:-/nonexistent}" ] ||
     [ -z "${EXPO_ASC_KEY_ID:-}" ] ||
     [ -z "${EXPO_ASC_ISSUER_ID:-}" ]; then
    echo "tools/eas.sh: App Store Connect API key is incomplete, falling back to Apple ID sign-in." >&2
    echo "tools/eas.sh: fill EXPO_ASC_KEY_ID and EXPO_ASC_ISSUER_ID in .env.eas and save the .p8 to skip 2FA." >&2
    unset EXPO_ASC_API_KEY_PATH EXPO_ASC_KEY_ID EXPO_ASC_ISSUER_ID
  fi
fi

# Apple answers a malformed key id or issuer id with a bare 401 that names
# neither, so check the shapes here where the fix is obvious. The key id is 10
# characters; the issuer id is a UUID, and pasting the key id into both is the
# easy mistake because App Store Connect shows them on the same screen.
if [ -n "${EXPO_ASC_KEY_ID:-}" ]; then
  case "$EXPO_ASC_ISSUER_ID" in
    ????????-????-????-????-????????????) ;;
    *)
      echo "tools/eas.sh: EXPO_ASC_ISSUER_ID is not a UUID." >&2
      echo "tools/eas.sh: it is the 'Issuer ID' shown above the key list in App Store Connect," >&2
      echo "tools/eas.sh: Users and Access > Integrations, not the 10-character Key ID." >&2
      exit 1
      ;;
  esac
fi

# EAS archives the project from git. Until the repo has its first commit there is nothing to
# archive, so build straight from the working tree; .easignore keeps secrets and build
# output out of the upload.
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  EAS_NO_VCS=1
  export EAS_NO_VCS
fi

# Not a project dependency (expo-doctor forbids it); eas.json pins the minimum version.
exec npx --yes eas-cli@latest "$@"
