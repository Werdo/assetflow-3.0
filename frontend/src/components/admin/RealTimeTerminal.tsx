/**
 * AssetFlow - Real-Time Terminal Component
 * Displays real-time command execution output using Server-Sent Events (SSE)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, Spinner, Badge, Button } from 'react-bootstrap';

interface TerminalMessage {
  type: 'stdout' | 'stderr' | 'error' | 'complete';
  message?: string;
  success?: boolean;
  exitCode?: number;
}

interface RealTimeTerminalProps {
  endpoint: string;
  isExecuting: boolean;
  onComplete?: (success: boolean) => void;
  title?: string;
}

export const RealTimeTerminal: React.FC<RealTimeTerminalProps> = ({
  endpoint,
  isExecuting,
  onComplete,
  title = 'Salida del Comando'
}) => {
  const [output, setOutput] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const eventSourceRef = useRef<EventSource | null>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output]);

  // Handle streaming connection
  useEffect(() => {
    if (!isExecuting) {
      return;
    }

    // Clear previous output
    setOutput([]);
    setStatus('running');

    const abortController = new AbortController();

    // Start fetch streaming
    const startStreaming = async () => {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error('Failed to start execution');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data: TerminalMessage = JSON.parse(line.substring(6));

                if (data.type === 'stdout' || data.type === 'stderr') {
                  if (data.message) {
                    setOutput(prev => [...prev, data.message!]);
                  }
                } else if (data.type === 'complete') {
                  setStatus(data.success ? 'success' : 'error');
                  if (data.message) {
                    setOutput(prev => [...prev, '', `✓ ${data.message}`]);
                  }
                  if (onComplete) {
                    onComplete(data.success || false);
                  }
                  return;
                } else if (data.type === 'error') {
                  setStatus('error');
                  if (data.message) {
                    setOutput(prev => [...prev, '', `✗ ${data.message}`]);
                  }
                  if (onComplete) {
                    onComplete(false);
                  }
                  return;
                }
              } catch (error) {
                console.error('Error parsing SSE data:', error);
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Streaming error:', error);
          setStatus('error');
          setOutput(prev => [...prev, '', `✗ Error: ${error.message}`]);
          if (onComplete) {
            onComplete(false);
          }
        }
      }
    };

    startStreaming();

    // Cleanup on unmount or when isExecuting changes
    return () => {
      abortController.abort();
    };
  }, [isExecuting, endpoint, onComplete]);

  const getStatusBadge = () => {
    switch (status) {
      case 'running':
        return (
          <Badge bg="primary">
            <Spinner animation="border" size="sm" className="me-1" />
            Ejecutando...
          </Badge>
        );
      case 'success':
        return <Badge bg="success">Completado</Badge>;
      case 'error':
        return <Badge bg="danger">Error</Badge>;
      default:
        return <Badge bg="secondary">Listo</Badge>;
    }
  };

  const clearOutput = () => {
    setOutput([]);
    setStatus('idle');
  };

  if (!isExecuting && output.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-sm mt-3">
      <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center">
        <span>
          <i className="bi bi-terminal me-2"></i>
          {title}
        </span>
        <div className="d-flex align-items-center gap-2">
          {getStatusBadge()}
          {!isExecuting && output.length > 0 && (
            <Button variant="outline-light" size="sm" onClick={clearOutput}>
              <i className="bi bi-x-circle me-1"></i>
              Limpiar
            </Button>
          )}
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <pre
          className="mb-0 bg-dark text-light p-3"
          style={{
            maxHeight: '400px',
            overflow: 'auto',
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: '0.85rem',
            lineHeight: '1.4'
          }}
        >
          {output.length === 0 && status === 'running' && (
            <div className="text-center py-3">
              <Spinner animation="border" variant="light" size="sm" className="me-2" />
              <span>Esperando salida...</span>
            </div>
          )}
          {output.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
          <div ref={outputEndRef} />
        </pre>
      </Card.Body>
    </Card>
  );
};

export default RealTimeTerminal;
