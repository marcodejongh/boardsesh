import React, { useState } from "react";
import BoardForm from "./BoardForm";
import LoginModal from "./LoginModal";

const App = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [boardName, setBoardName] = useState("kilter");

  // const handleLoginButtonClick = () => {
  //   setShowLoginModal(true);
  // };

  const handleModalClose = () => {
    setShowLoginModal(false);
  };

  return (
    <div className="container-sm text-center">
      <div className="row justify-content-md-center">
        <div className="col-md-5">
          <BoardForm />
        </div>
      </div>
      <div className="row justify-content-md-center mt-3">
        <footer> {/* Include your footer component here */} </footer>
      </div>
      {showLoginModal && <LoginModal boardName={boardName} onClose={handleModalClose} />}
    </div>
  );
};

export default App;
