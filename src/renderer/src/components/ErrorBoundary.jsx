import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const message = this.props.fallbackMessage || 'Something went wrong'
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <AlertTriangle size={48} className="error-boundary-icon" />
            <h2 className="error-boundary-title">Oops!</h2>
            <p className="error-boundary-message">{message}</p>
            {this.props.showDetails && this.state.error && (
              <p className="error-boundary-detail text-meta">
                {this.state.error.message}
              </p>
            )}
            <button className="btn btn-primary" onClick={this.handleRetry}>
              <RefreshCw size={18} />
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
