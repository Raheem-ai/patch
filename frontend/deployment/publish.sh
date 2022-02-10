FILES=$(git diff-tree --no-commit-id --name-only -r 0dd9fbb6c1f6f750cc322e552a1f9718994532b1)
FILES_TO_IGNORE=("frontend/README.md")

in_files_to_ignore () {
    local file=$1

    for to_ignore in $FILES_TO_IGNORE
    do
        if [[ $to_ignore == $file ]];
        then
            # 0 = true
            return 0
        fi
    done
    # 1 = false
    return 1
}

should_publish () {
    for file in $FILES
    do
        if [[ $file == common/* ]] || [[ $file == frontend/* ]] && !(in_files_to_ignore $file) ;
        then
            # 0 = true
            return 0
        fi
    done

    # 1 = false
    return 1
}

if should_publish;
then
    # login to expo
    
    # publish to release channel
    expo publish --release-channel $_ENVIRONMENT
else
    echo dont publish!
fi