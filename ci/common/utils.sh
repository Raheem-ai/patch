in_files_to_ignore () {
    local file=$1
    local FILES_TO_IGNORE=$2

    echo 'File: ' $file
    echo 'To Ignore: ' $FILES_TO_IGNORE

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
    files_param=$1[@]
    to_include_param=$2[@]
    to_ignore_param=$3[@]

    files=("${!files_param}")
    files_to_include=("${!to_include_param}")
    files_to_ignore=("${!to_ignore_param}")

    echo "Checking if we should publish: "
    echo "Files to check: ${files[*]}"
    echo "Files that should cause publish: ${files_to_include[*]}"
    echo "Files that shouldn't cause publish: ${files_to_ignore[*]}"

    for file in ${files[@]}
    do
        # 1 = false 
        local publishable=1

        for to_include in ${files_to_include[@]}
        do 
            echo $file $to_include
            if [[ $file =~ ^$to_include$ ]] ;
            then
                publishable=0
                break
            fi

            echo $publishable
        done

        if [[ $publishable == 0 ]] && !(in_files_to_ignore $file $files_to_ignore) ;
        then
            # 0 = true
            return 0
        fi
    done

    # 1 = false
    return 1
}

# rc_files_changed () {
#     # git tag -a rc 53ec403 -m 'rc-53ec403'
#     # git tag -a rc 3c4c0fd -m 'rc-3c4c0fd'

    

#     # gets me the list of tags with the latest first
#     tagString=$(git tag --list "rc-*" --sort=creatordate)
#     tags=($(echo $tagString | tr " " "\n"))

#     # choose latest tag
#     tag=${tags[0]}

#     # gets the commit for the tag
#     rc_commit=$(git rev-parse tags/$tag~0) 

#     # echo $rc_commit
#     # echo $(git diff --name-only $rc_commit)
# }

# rc_files_changed