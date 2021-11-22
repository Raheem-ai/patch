import React, { ErrorInfo } from 'react';


export default class GlobalErrorBoundary extends React.Component {
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(error, errorInfo)
    }

    render() {
        return this.props.children
    }
}