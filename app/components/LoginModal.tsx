import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";

const LoginModal = ({ boardName, onClose }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    fetch("/api/v1/login", {
      method: "POST",
      body: JSON.stringify({
        board: boardName,
        username: username,
        password: password,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    }).then((response) => {
      response.json().then((json) => {
        if (!response.ok) {
          setError(json["error"]);
        } else {
          document.cookie = `${boardName}_login=${JSON.stringify(json)}; SameSite=Strict; Secure;`;
          onClose();
        }
      });
    });
  };

  return (
    <Modal show onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>{`${boardName.charAt(0).toUpperCase() + boardName.slice(1)} Board Login`}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form id="form-login" onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="input-username" className="form-label">{`${
              boardName.charAt(0).toUpperCase() + boardName.slice(1)
            } Board Username`}</label>
            <input
              type="text"
              className="form-control"
              id="input-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="input-password" className="form-label">{`${
              boardName.charAt(0).toUpperCase() + boardName.slice(1)
            } Board Password`}</label>
            <input
              type="password"
              className="form-control"
              id="input-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-danger">{error}</p>}
          <div className="modal-footer">
            <Button variant="primary" type="submit">
              Login
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default LoginModal;
