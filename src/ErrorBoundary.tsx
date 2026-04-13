import React from 'react';

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Erro desconhecido' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Erro capturado pelo ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#111',
            color: '#fff',
            padding: '24px',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          <h1 style={{ color: '#f87171', marginTop: 0 }}>Erro de Execução Capturado</h1>
          <p>O app encontrou um erro e foi interrompido para evitar tela branca silenciosa.</p>
          <p>
            <strong>Mensagem:</strong> {this.state.message}
          </p>
          <p>Abra o console do navegador (F12) para detalhes técnicos.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
