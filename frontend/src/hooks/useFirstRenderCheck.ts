import { useState } from "react";

export default function useFirstRenderCheck() {
    const [isFirstCheck] = useState((() => {
        let flag = true;
        return () => {
            if (flag) {
                flag = false;
                return !flag;
            } else {
                return flag
            }
        }
    }));

    return isFirstCheck
}