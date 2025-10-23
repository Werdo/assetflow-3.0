/**
 * AssetFlow 3.0 - IA Chat Page
 * Chat conversacional con IA estilo ChatGPT - Versión Bootstrap
 */

import React, { useState, useRef, useEffect } from 'react';
import { aiService } from '../../services/aiService';
import { Container, Row, Col, Card, Form, Button, Badge, Alert, Spinner } from 'react-bootstrap';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const IAChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);
    setError(null);

    try {
      const historial = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await aiService.chat(userMessage.content, historial);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.respuesta,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || 'Error al comunicarse con la IA');
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta nuevamente.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('¿Deseas limpiar el chat actual?')) {
      setMessages([]);
    }
  };

  return (
    <Container fluid className="py-4" style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Row className="mb-3">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <i className="bi bi-robot text-primary" style={{ fontSize: '2.5rem' }}></i>
              <div>
                <h2 className="mb-0 fw-bold">Asistente IA AssetFlow</h2>
                <p className="text-muted mb-0 small">Pregunta sobre depósitos, movimientos, reportes y más</p>
              </div>
            </div>
            <Button variant="outline-danger" size="sm" onClick={handleClearChat}>
              <i className="bi bi-trash me-2"></i>
              Limpiar Chat
            </Button>
          </div>
        </Col>
      </Row>

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          {error}
        </Alert>
      )}

      {/* Chat Messages */}
      <Card className="flex-grow-1 mb-3" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Card.Body style={{ overflowY: 'auto', flex: 1 }}>
          {messages.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-robot text-primary mb-3" style={{ fontSize: '4rem' }}></i>
              <h4 className="fw-bold mb-3">¡Hola! Soy tu asistente de AssetFlow</h4>
              <p className="text-muted mb-4">
                Puedo ayudarte con consultas sobre depósitos, movimientos, análisis predictivos y más.
              </p>
              <div className="d-flex flex-wrap gap-2 justify-content-center">
                <Badge
                  bg="light"
                  text="dark"
                  className="px-3 py-2 cursor-pointer"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setInputMessage('¿Cuántos depósitos están activos?')}
                >
                  ¿Cuántos depósitos están activos?
                </Badge>
                <Badge
                  bg="light"
                  text="dark"
                  className="px-3 py-2"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setInputMessage('Analiza los vencimientos próximos')}
                >
                  Analiza los vencimientos próximos
                </Badge>
                <Badge
                  bg="light"
                  text="dark"
                  className="px-3 py-2"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setInputMessage('Genera un reporte del mes actual')}
                >
                  Genera un reporte del mes actual
                </Badge>
              </div>
            </div>
          ) : (
            <div>
              {messages.map((message, index) => (
                <div key={index} className={`d-flex gap-3 mb-4 ${message.role === 'user' ? 'justify-content-end' : ''}`}>
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                        <i className="bi bi-robot"></i>
                      </div>
                    </div>
                  )}
                  <div style={{ maxWidth: '70%' }}>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <strong className="small">{message.role === 'user' ? 'Tú' : 'Asistente IA'}</strong>
                      <small className="text-muted">
                        {message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </div>
                    <Card bg={message.role === 'user' ? 'primary' : 'light'} text={message.role === 'user' ? 'white' : 'dark'}>
                      <Card.Body className="py-2 px-3">
                        <p className="mb-0" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {message.content}
                        </p>
                      </Card.Body>
                    </Card>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                        <i className="bi bi-person"></i>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="d-flex gap-3 mb-4">
                  <div className="flex-shrink-0">
                    <div className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                      <i className="bi bi-robot"></i>
                    </div>
                  </div>
                  <div>
                    <strong className="small">Asistente IA</strong>
                    <Card bg="light" className="mt-1">
                      <Card.Body className="py-2 px-3">
                        <Spinner animation="border" size="sm" className="me-2" />
                        <span className="text-muted small">Pensando...</span>
                      </Card.Body>
                    </Card>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Input Form */}
      <Form onSubmit={handleSendMessage}>
        <Row>
          <Col>
            <div className="d-flex gap-2">
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Escribe tu mensaje..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                disabled={loading}
              />
              <Button
                variant="primary"
                type="submit"
                disabled={!inputMessage.trim() || loading}
                style={{ minWidth: 100 }}
              >
                <i className="bi bi-send me-2"></i>
                Enviar
              </Button>
            </div>
          </Col>
        </Row>
      </Form>
    </Container>
  );
};

export default IAChatPage;
