/**
 * AssetFlow - Terminal de Administración
 * Terminal interactivo para ejecutar comandos del sistema
 */

import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import toast from 'react-hot-toast';
import terminalService from '../../services/terminalService';

interface CommandHistoryEntry {
  command: string;
  timestamp: Date;
  output: string | any;
  success: boolean;
  type: 'text' | 'json';
}

interface SystemInfo {
  hostname: string;
  uptime: string;
  memory: { total: string; used: string; free: string };
  disk: { total: string; used: string; free: string; percent: string };
  docker: { version: string };
}

export const TerminalPage: React.FC = () => {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [executing, setExecuting] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [allowedCommands, setAllowedCommands] = useState<any>({});
  const [showHelp, setShowHelp] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSystemInfo();
    loadAllowedCommands();
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new output is added
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  const loadSystemInfo = async () => {
    try {
      const info = await terminalService.getSystemInfo();
      setSystemInfo(info);
    } catch (error: any) {
      console.error('Failed to load system info:', error);
    }
  };

  const loadAllowedCommands = async () => {
    try {
      const commands = await terminalService.getAllowedCommands();
      setAllowedCommands(commands);
    } catch (error: any) {
      console.error('Failed to load commands:', error);
    }
  };

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    setExecuting(true);

    const entry: CommandHistoryEntry = {
      command: cmd,
      timestamp: new Date(),
      output: '',
      success: false,
      type: 'text'
    };

    try {
      const result = await terminalService.executeCommand(cmd);
      entry.output = result.output;
      entry.success = result.success;
      entry.type = result.type;

      if (!result.success) {
        toast.error('Comando falló');
      }
    } catch (error: any) {
      entry.output = error.response?.data?.message || error.message;
      entry.success = false;
      toast.error('Error ejecutando comando');
    }

    setHistory([...history, entry]);
    setCommand('');
    setHistoryIndex(-1);
    setExecuting(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(command);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCommand(history[history.length - 1 - newIndex].command);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(history[history.length - 1 - newIndex].command);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const clearTerminal = () => {
    setHistory([]);
    setHistoryIndex(-1);
  };

  const renderOutput = (entry: CommandHistoryEntry) => {
    if (entry.type === 'json') {
      return (
        <pre className="mb-0 text-info">
          {JSON.stringify(entry.output, null, 2)}
        </pre>
      );
    }
    return (
      <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {entry.output}
      </pre>
    );
  };

  const quickCommands = [
    { label: 'Docker PS', cmd: 'docker ps' },
    { label: 'Docker Stats', cmd: 'docker stats --no-stream' },
    { label: 'Disk Usage', cmd: 'df -h' },
    { label: 'Memory', cmd: 'free -h' },
    { label: 'Backup Status', cmd: 'backup-status' },
    { label: 'Snapshot Status', cmd: 'snapshot-status' },
  ];

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold mb-1">
                <i className="bi bi-terminal me-2"></i>
                Terminal del Sistema
              </h2>
              <p className="text-muted mb-0">
                Ejecuta comandos del sistema de forma segura
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-info"
                size="sm"
                onClick={() => setShowHelp(!showHelp)}
              >
                <i className="bi bi-question-circle me-1"></i>
                Ayuda
              </Button>
              <Button
                variant="outline-warning"
                size="sm"
                onClick={clearTerminal}
              >
                <i className="bi bi-trash me-1"></i>
                Limpiar
              </Button>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={loadSystemInfo}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Actualizar
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* System Info */}
      {systemInfo && (
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm bg-dark text-white">
              <Card.Body className="py-3">
                <Row className="g-3">
                  <Col md={3}>
                    <div className="small text-white-50">Hostname</div>
                    <div className="fw-semibold">{systemInfo.hostname}</div>
                  </Col>
                  <Col md={3}>
                    <div className="small text-white-50">Uptime</div>
                    <div className="fw-semibold">{systemInfo.uptime}</div>
                  </Col>
                  <Col md={3}>
                    <div className="small text-white-50">Memory</div>
                    <div className="fw-semibold">
                      {systemInfo.memory.used} / {systemInfo.memory.total}
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="small text-white-50">Disk</div>
                    <div className="fw-semibold">
                      {systemInfo.disk.used} / {systemInfo.disk.total} ({systemInfo.disk.percent})
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Help Panel */}
      {showHelp && (
        <Row className="mb-4">
          <Col>
            <Alert variant="info" dismissible onClose={() => setShowHelp(false)}>
              <Alert.Heading>
                <i className="bi bi-info-circle me-2"></i>
                Comandos Disponibles
              </Alert.Heading>
              <div className="small">
                {Object.entries(allowedCommands).map(([category, commands]: [string, any]) => (
                  <div key={category} className="mb-3">
                    <strong className="text-uppercase">{category}:</strong>
                    <ul className="mb-0 mt-1">
                      {commands.map((cmd: any, idx: number) => (
                        <li key={idx}>
                          <code>{cmd.command}</code>
                          {cmd.requiresConfirm && (
                            <Badge bg="warning" className="ms-2">Requiere confirmación</Badge>
                          )}
                          {cmd.safe && (
                            <Badge bg="success" className="ms-2">Seguro</Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <hr />
              <div className="small">
                <strong>Navegación:</strong>
                <ul className="mb-0">
                  <li>↑/↓ - Navegar por el historial de comandos</li>
                  <li>Enter - Ejecutar comando</li>
                  <li>Ctrl+L - Limpiar terminal</li>
                </ul>
              </div>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Quick Commands */}
      <Row className="mb-3">
        <Col>
          <div className="d-flex gap-2 flex-wrap">
            <span className="text-muted small align-self-center">Comandos rápidos:</span>
            {quickCommands.map((qc, idx) => (
              <Button
                key={idx}
                variant="outline-secondary"
                size="sm"
                onClick={() => executeCommand(qc.cmd)}
                disabled={executing}
              >
                {qc.label}
              </Button>
            ))}
          </div>
        </Col>
      </Row>

      {/* Terminal Output */}
      <Row className="mb-3">
        <Col>
          <Card className="border-0 shadow-sm" style={{ backgroundColor: '#1e1e1e' }}>
            <Card.Body className="p-0">
              <div
                ref={outputRef}
                className="p-3 font-monospace small text-light"
                style={{
                  height: '500px',
                  overflowY: 'auto',
                  backgroundColor: '#1e1e1e'
                }}
              >
                {history.length === 0 && (
                  <div className="text-white-50">
                    <p>AssetFlow Terminal v3.5</p>
                    <p>Escribe 'help' para ver comandos disponibles o usa los botones de comandos rápidos.</p>
                  </div>
                )}

                {history.map((entry, idx) => (
                  <div key={idx} className="mb-3">
                    <div className="text-success">
                      <span className="text-info">$</span> {entry.command}
                      <span className="text-white-50 ms-2 small">
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className={entry.success ? 'text-light' : 'text-danger'}>
                      {renderOutput(entry)}
                    </div>
                  </div>
                ))}

                {executing && (
                  <div className="text-warning">
                    <Spinner animation="border" size="sm" className="me-2" />
                    Ejecutando...
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Command Input */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm" style={{ backgroundColor: '#2d2d2d' }}>
            <Card.Body className="p-3">
              <Form onSubmit={handleSubmit}>
                <div className="d-flex gap-2 align-items-center">
                  <span className="text-success font-monospace">$</span>
                  <Form.Control
                    ref={inputRef}
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe un comando..."
                    disabled={executing}
                    className="font-monospace bg-dark text-light border-0"
                    style={{ fontSize: '0.9rem' }}
                    autoComplete="off"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    variant="success"
                    disabled={executing || !command.trim()}
                  >
                    {executing ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <>
                        <i className="bi bi-play-fill"></i> Ejecutar
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default TerminalPage;
