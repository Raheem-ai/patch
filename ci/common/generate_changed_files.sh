
echo git fetch --depth=3 patch:Raheem-ai/patch.git $_MERGED_SHA
git fetch --depth=3 patch:Raheem-ai/patch.git $_MERGED_SHA

# echo git diff-tree --no-commit-id --name-only -r $_MERGED_SHA
# FILES=$(git diff-tree --no-commit-id --name-only -r $_MERGED_SHA)
# echo $FILES >> changedFiles.txt
# cat changedFiles.txt
