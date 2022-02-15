# echo \"$PATCH_SSH_KEY\" >> /root/.ssh/id_rsa
# chmod 600 /root/.ssh/id_rsa
# ssh-keyscan -t rsa github.com > known_hosts.github
# cp known_hosts.github /root/.ssh/known_hosts

echo git fetch --depth=3 patch:Raheem-ai/patch.git $_MERGED_SHA
git fetch --depth=3 patch:Raheem-ai/patch.git $_MERGED_SHA

echo git diff-tree --no-commit-id --name-only -r $_MERGED_SHA
FILES=$(git diff-tree --no-commit-id --name-only -r $_MERGED_SHA)
echo $FILES

echo git log
git log

