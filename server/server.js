
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);
const validStatuses = ["Planning", "Active", "Completed"];

async function startServer() {
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully!");

    const db = client.db("pa2");

    // Existing Assignment 2 users
    const users = db.collection("users");

    // Assignment 3 collections
    const projects = db.collection("projects");
    const memberships = db.collection("projectMemberships");

    // Prevent duplicate membership records
    await memberships.createIndex(
      { project_id: 1, user_id: 1 },
      { unique: true }
    );

    // ---------------- SIGN UP ----------------
    app.post("/signup", async (req, res) => {
      try {
        const { f_name, l_name, username, password } = req.body;

        if (
          typeof f_name !== "string" ||
          !f_name.trim() ||
          typeof l_name !== "string" ||
          !l_name.trim() ||
          typeof username !== "string" ||
          !username.trim() ||
          typeof password !== "string" ||
          !password
        ) {
          return res.status(400).json({
            message: "Please fill in all fields.",
          });
        }

        const cleanUsername = username.trim();

        const existingUser = await users.findOne({
          username: cleanUsername,
        });

        if (existingUser) {
          return res.status(409).json({
            message: "Username already exists.",
          });
        }

        await users.insertOne({
          f_name: f_name.trim(),
          l_name: l_name.trim(),
          username: cleanUsername,
          password,
        });

        return res.status(201).json({
          message: "Account created successfully!",
        });
      } catch (error) {
        console.error("Signup error:", error);

        return res.status(500).json({
          message: "Server error. Please try again.",
        });
      }
    });

    // ---------------- LOGIN ----------------
    app.post("/login", async (req, res) => {
      try {
        const { username, password } = req.body;

        if (
          typeof username !== "string" ||
          !username.trim() ||
          typeof password !== "string" ||
          !password
        ) {
          return res.status(400).json({
            message: "Please enter your username and password.",
          });
        }

        const user = await users.findOne({
          username: username.trim(),
        });

        if (!user || user.password !== password) {
          return res.status(401).json({
            message: "Invalid username or password.",
          });
        }

        return res.status(200).json({
          message: "Login successful!",
        });
      } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
          message: "Server error. Please try again.",
        });
      }
    });

    // ---------------- GET REGISTERED USERS ----------------
    app.get("/users", async (req, res) => {
      try {
        const registeredUsers = await users
          .find({})
          .project({ password: 0 })
          .sort({ username: 1 })
          .toArray();

        return res.json(registeredUsers);
      } catch (error) {
        console.error("Get users error:", error);

        return res.status(500).json({
          message: "Unable to retrieve users.",
        });
      }
    });

    // ---------------- CREATE PROJECT ----------------
    app.post("/projects", async (req, res) => {
      let createdProjectId;

      try {
        const { name, description, status, project_lead_id } = req.body;

        if (
          typeof name !== "string" ||
          !name.trim() ||
          typeof description !== "string" ||
          !description.trim() ||
          typeof status !== "string" ||
          !validStatuses.includes(status) ||
          typeof project_lead_id !== "string" ||
          !ObjectId.isValid(project_lead_id)
        ) {
          return res.status(400).json({
            message:
              "Provide a project name, description, valid status, and Project Lead.",
          });
        }

        const leadId = new ObjectId(project_lead_id);

        const lead = await users.findOne({ _id: leadId });

        if (!lead) {
          return res.status(400).json({
            message: "The selected Project Lead does not exist.",
          });
        }

        const project = {
          name: name.trim(),
          description: description.trim(),
          status,
          project_lead_id: leadId,
        };

        const result = await projects.insertOne(project);
        createdProjectId = result.insertedId;

        // Automatically make the Project Lead a member
        await memberships.insertOne({
          project_id: createdProjectId,
          user_id: leadId,
        });

        return res.status(201).json({
          message: "Project created successfully!",
          project: {
            _id: createdProjectId,
            ...project,
            project_lead: {
              f_name: lead.f_name,
              l_name: lead.l_name,
              username: lead.username,
            },
          },
        });
      } catch (error) {
        console.error("Create project error:", error);

        // Clean up if the membership could not be created
        if (createdProjectId) {
          try {
            await memberships.deleteOne({
              project_id: createdProjectId,
            });

            await projects.deleteOne({
              _id: createdProjectId,
            });
          } catch (cleanupError) {
            console.error("Project cleanup error:", cleanupError);
          }
        }

        return res.status(500).json({
          message: "Unable to create the project.",
        });
      }
    });

    // ---------------- LIST PROJECTS ----------------
    app.get("/projects", async (req, res) => {
      try {
        const allProjects = await projects
          .aggregate([
            {
              $lookup: {
                from: "users",
                localField: "project_lead_id",
                foreignField: "_id",
                as: "lead",
              },
            },
            {
              $unwind: {
                path: "$lead",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                name: 1,
                description: 1,
                status: 1,
                project_lead_id: 1,
                project_lead: {
                  f_name: "$lead.f_name",
                  l_name: "$lead.l_name",
                  username: "$lead.username",
                },
              },
            },
            { $sort: { name: 1 } },
          ])
          .toArray();

        return res.json(allProjects);
      } catch (error) {
        console.error("Get projects error:", error);

        return res.status(500).json({
          message: "Unable to retrieve projects.",
        });
      }
    });

    // ---------------- LIST PROJECT MEMBERS ----------------
    app.get("/projects/:projectId/members", async (req, res) => {
      try {
        const { projectId } = req.params;

        if (!ObjectId.isValid(projectId)) {
          return res.status(400).json({
            message: "Invalid project ID.",
          });
        }

        const projectObjectId = new ObjectId(projectId);

        const project = await projects.findOne({
          _id: projectObjectId,
        });

        if (!project) {
          return res.status(404).json({
            message: "Project not found.",
          });
        }

        const projectMembers = await memberships
          .aggregate([
            { $match: { project_id: projectObjectId } },
            {
              $lookup: {
                from: "users",
                localField: "user_id",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: "$user" },
            {
              $project: {
                _id: 1,
                project_id: 1,
                user_id: 1,
                f_name: "$user.f_name",
                l_name: "$user.l_name",
                username: "$user.username",
                is_project_lead: {
                  $eq: ["$user_id", project.project_lead_id],
                },
              },
            },
            { $sort: { username: 1 } },
          ])
          .toArray();

        return res.json(projectMembers);
      } catch (error) {
        console.error("Get members error:", error);

        return res.status(500).json({
          message: "Unable to retrieve project members.",
        });
      }
    });

    // ---------------- ADD PROJECT MEMBER ----------------
    app.post("/projects/:projectId/members", async (req, res) => {
      try {
        const { projectId } = req.params;
        const { user_id } = req.body;

        if (
          !ObjectId.isValid(projectId) ||
          typeof user_id !== "string" ||
          !ObjectId.isValid(user_id)
        ) {
          return res.status(400).json({
            message: "A valid project ID and user ID are required.",
          });
        }

        const projectObjectId = new ObjectId(projectId);
        const userObjectId = new ObjectId(user_id);

        const project = await projects.findOne({
          _id: projectObjectId,
        });

        if (!project) {
          return res.status(404).json({
            message: "Project not found.",
          });
        }

        const user = await users.findOne({
          _id: userObjectId,
        });

        if (!user) {
          return res.status(404).json({
            message: "User not found.",
          });
        }

        const existingMembership = await memberships.findOne({
          project_id: projectObjectId,
          user_id: userObjectId,
        });

        if (existingMembership) {
          return res.status(409).json({
            message: "User is already a member of this project.",
          });
        }

        await memberships.insertOne({
          project_id: projectObjectId,
          user_id: userObjectId,
        });

        return res.status(201).json({
          message: "Member added successfully!",
        });
      } catch (error) {
        if (error.code === 11000) {
          return res.status(409).json({
            message: "User is already a member of this project.",
          });
        }

        console.error("Add member error:", error);

        return res.status(500).json({
          message: "Unable to add member.",
        });
      }
    });

    // ---------------- REMOVE PROJECT MEMBER ----------------
    app.delete(
      "/projects/:projectId/members/:userId",
      async (req, res) => {
        try {
          const { projectId, userId } = req.params;

          if (
            !ObjectId.isValid(projectId) ||
            !ObjectId.isValid(userId)
          ) {
            return res.status(400).json({
              message: "Invalid project ID or user ID.",
            });
          }

          const projectObjectId = new ObjectId(projectId);
          const userObjectId = new ObjectId(userId);

          const project = await projects.findOne({
            _id: projectObjectId,
          });

          if (!project) {
            return res.status(404).json({
              message: "Project not found.",
            });
          }

          const user = await users.findOne({
            _id: userObjectId,
          });

          if (!user) {
            return res.status(404).json({
              message: "User not found.",
            });
          }

          if (project.project_lead_id.equals(userObjectId)) {
            return res.status(400).json({
              message: "The Project Lead cannot be removed.",
            });
          }

          const result = await memberships.deleteOne({
            project_id: projectObjectId,
            user_id: userObjectId,
          });

          if (result.deletedCount === 0) {
            return res.status(404).json({
              message: "This user is not a member of the project.",
            });
          }

          return res.json({
            message: "Member removed successfully!",
          });
        } catch (error) {
          console.error("Remove member error:", error);

          return res.status(500).json({
            message: "Unable to remove member.",
          });
        }
      }
    );

    // ---------------- SERVER STATUS ----------------
    app.get("/", (req, res) => {
      res.send("Server is running");
    });

    app.listen(9000, () => {
      console.log("Server running on port 9000");
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exitCode = 1;
  }
}

startServer();
