
import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:9000";

function App() {
  const [page, setPage] = useState("signup");
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [signup, setSignup] = useState({
    f_name: "",
    l_name: "",
    username: "",
    password: "",
  });

  const [login, setLogin] = useState({
    username: "",
    password: "",
  });

  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    status: "Planning",
    project_lead_id: "",
  });

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }

    return data;
  }

  async function loadUsers() {
    const data = await request("/users");
    setUsers(data);
    return data;
  }

  async function loadProjects() {
    const data = await request("/projects");
    setProjects(data);

    if (
      selectedProject &&
      !data.some((project) => project._id === selectedProject)
    ) {
      setSelectedProject("");
      setMembers([]);
    }

    return data;
  }

  async function loadMembers(projectId) {
    if (!projectId) {
      setMembers([]);
      return;
    }

    const data = await request(`/projects/${projectId}/members`);
    setMembers(data);
  }

  async function refreshData() {
    setError("");
    try {
      await Promise.all([loadUsers(), loadProjects()]);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProject) {
      loadMembers(selectedProject).catch((err) => setError(err.message));
    } else {
      setMembers([]);
    }
  }, [selectedProject]);

  async function handleSignup(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const data = await request("/signup", {
        method: "POST",
        body: JSON.stringify(signup),
      });
      setMessage(data.message);
      setSignup({
        f_name: "",
        l_name: "",
        username: "",
        password: "",
      });
      setPage("login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      await request("/login", {
        method: "POST",
        body: JSON.stringify(login),
      });

      const allUsers = await loadUsers();
      const loggedInUser = allUsers.find(
        (item) => item.username === login.username.trim()
      );

      if (!loggedInUser) {
        throw new Error("Could not find your account.");
      }

      setUser(loggedInUser);
      setMessage("Login successful!");
      setLogin({ username: "", password: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const data = await request("/projects", {
        method: "POST",
        body: JSON.stringify(projectForm),
      });

      setMessage(data.message);
      setProjectForm({
        name: "",
        description: "",
        status: "Planning",
        project_lead_id: "",
      });

      await loadProjects();
      await loadUsers();

      if (data.project?._id) {
        setSelectedProject(data.project._id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!selectedProject || !selectedUser) {
      setError("Select a project and a user.");
      return;
    }

    setLoading(true);

    try {
      const data = await request(
        `/projects/${selectedProject}/members`,
        {
          method: "POST",
          body: JSON.stringify({ user_id: selectedUser }),
        }
      );

      setMessage(data.message);
      setSelectedUser("");
      await loadMembers(selectedProject);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMember(userId) {
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const data = await request(
        `/projects/${selectedProject}/members/${userId}`,
        { method: "DELETE" }
      );

      setMessage(data.message);
      await loadMembers(selectedProject);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setUser(null);
    setProjects([]);
    setMembers([]);
    setUsers([]);
    setSelectedProject("");
    setMessage("");
    setError("");
    setPage("login");
  }

  if (!user) {
    return (
      <main className="container">
        <section className="form-box">
          <h1>{page === "signup" ? "Create Account" : "Welcome Back"}</h1>

          <div className="tabs">
            <button
              type="button"
              onClick={() => {
                setPage("signup");
                setMessage("");
                setError("");
              }}
            >
              Signup
            </button>
            <button
              type="button"
              onClick={() => {
                setPage("login");
                setMessage("");
                setError("");
              }}
            >
              Login
            </button>
          </div>

          {page === "signup" ? (
            <form onSubmit={handleSignup}>
              <input
                required
                placeholder="First Name"
                value={signup.f_name}
                onChange={(e) =>
                  setSignup({ ...signup, f_name: e.target.value })
                }
              />
              <input
                required
                placeholder="Last Name"
                value={signup.l_name}
                onChange={(e) =>
                  setSignup({ ...signup, l_name: e.target.value })
                }
              />
              <input
                required
                placeholder="Username"
                value={signup.username}
                onChange={(e) =>
                  setSignup({ ...signup, username: e.target.value })
                }
              />
              <input
                required
                type="password"
                placeholder="Password"
                value={signup.password}
                onChange={(e) =>
                  setSignup({ ...signup, password: e.target.value })
                }
              />
              <button disabled={loading} type="submit">
                {loading ? "Please wait..." : "Create Account"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <input
                required
                placeholder="Username"
                value={login.username}
                onChange={(e) =>
                  setLogin({ ...login, username: e.target.value })
                }
              />
              <input
                required
                type="password"
                placeholder="Password"
                value={login.password}
                onChange={(e) =>
                  setLogin({ ...login, password: e.target.value })
                }
              />
              <button disabled={loading} type="submit">
                {loading ? "Please wait..." : "Login"}
              </button>
            </form>
          )}

          {message && <p className="message">{message}</p>}
          {error && <p className="error-message">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Project Management</h1>
          <p>
            Welcome, {user.f_name} {user.l_name} (@{user.username})
          </p>
        </div>
        <button type="button" onClick={logout}>
          Log Out
        </button>
      </header>

      {message && <p className="message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <section className="panel">
        <h2>Create a Project</h2>

        <form className="project-form" onSubmit={handleCreateProject}>
          <label>
            Project Name
            <input
              required
              value={projectForm.name}
              onChange={(e) =>
                setProjectForm({ ...projectForm, name: e.target.value })
              }
              placeholder="Enter project name"
            />
          </label>

          <label>
            Description
            <textarea
              required
              value={projectForm.description}
              onChange={(e) =>
                setProjectForm({
                  ...projectForm,
                  description: e.target.value,
                })
              }
              placeholder="Describe the project"
              rows="3"
            />
          </label>

          <label>
            Status
            <select
              value={projectForm.status}
              onChange={(e) =>
                setProjectForm({ ...projectForm, status: e.target.value })
              }
            >
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
            </select>
          </label>

          <label>
            Project Lead
            <select
              required
              value={projectForm.project_lead_id}
              onChange={(e) =>
                setProjectForm({
                  ...projectForm,
                  project_lead_id: e.target.value,
                })
              }
            >
              <option value="">Choose a registered user</option>
              {users.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.f_name} {item.l_name} (@{item.username})
                </option>
              ))}
            </select>
          </label>

          <button disabled={loading} type="submit">
            Create Project
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>All Projects</h2>

        {projects.length === 0 ? (
          <p>No projects yet. Create your first project above.</p>
        ) : (
          <div className="project-grid">
            {projects.map((project) => (
              <article className="project-card" key={project._id}>
                <h3>{project.name}</h3>
                <p>{project.description}</p>
                <p>
                  <strong>Status:</strong> {project.status}
                </p>
                <p>
                  <strong>Project Lead:</strong>{" "}
                  {project.project_lead?.f_name || "Unknown"}{" "}
                  {project.project_lead?.l_name || ""} (
                  @{project.project_lead?.username || "unknown"})
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedProject(project._id)}
                >
                  Manage Members
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Project Membership</h2>

        <label>
          Select Project
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">Choose a project</option>
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        {selectedProject && (
          <>
            <h3>Current Members</h3>

            {members.length === 0 ? (
              <p>No members found for this project.</p>
            ) : (
              <ul className="member-list">
                {members.map((member) => (
                  <li key={member._id}>
                    <span>
                      {member.f_name} {member.l_name} (@{member.username})
                      {member.is_project_lead && (
                        <strong> — Project Lead</strong>
                      )}
                    </span>

                    {member.is_project_lead ? (
                      <span className="lead-note">Cannot remove lead</span>
                    ) : (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleRemoveMember(member.user_id)}
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <form className="add-member-form" onSubmit={handleAddMember}>
              <label>
                Add Registered User
                <select
                  required
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  <option value="">Choose a user</option>
                  {users
                    .filter(
                      (item) =>
                        !members.some(
                          (member) => member.user_id === item._id
                        )
                    )
                    .map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.f_name} {item.l_name} (@{item.username})
                      </option>
                    ))}
                </select>
              </label>

              <button disabled={loading} type="submit">
                Add Member
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

export default App;
