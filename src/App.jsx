import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ChatSection from "./components/ChatSection";
import useAgentApp from "./hooks/useAgentApp";


export default function App() {
  const agent = useAgentApp();

  return (
    <div className="app">
      <Header />

      <main className="app-main">
        <Sidebar
          projects={agent.projects}
          activeProject={agent.activeProject}
          chats={agent.chats}
          activeChat={agent.activeChat}
          setActiveChat={agent.setActiveChat}

          showNewProject={agent.showNewProject}
          setShowNewProject={agent.setShowNewProject}

          newProjectName={agent.newProjectName}
          setNewProjectName={agent.setNewProjectName}

          newProjectPath={agent.newProjectPath}
          setNewProjectPath={agent.setNewProjectPath}

          addProject={agent.addProject}
          newChat={agent.newChat}
          deleteChat={agent.deleteChat}
          selectProject={agent.selectProject}

          showInstructions={agent.showInstructions}
          setShowInstructions={agent.setShowInstructions}

          instructions={agent.instructions}
          setInstructions={agent.setInstructions}
          saveInstructions={agent.saveInstructions}

          instructionsSaved={agent.instructionsSaved}
          fileTree={agent.fileTree}
        />

        <ChatSection
          activeProject={agent.activeProject}
          activeChat={agent.activeChat}
          isThinking={agent.isThinking}
          messagesEndRef={agent.messagesEndRef}

          attachments={agent.attachments}
          input={agent.input}

          setInput={agent.setInput}

          removeAttachment={agent.removeAttachment}
          handleAttachment={agent.handleAttachment}
          handleKeyDown={agent.handleKeyDown}
          sendMessage={agent.sendMessage}
        />
      </main>
    </div>
  );
}

