# ICSI 418Y Programming Assignment 3: Project Management Application

## Overview

This project is a project management application built with React, Express, and MongoDB. It allows registered users to create projects, view projects, assign project leads, and manage project membership.

## Features

- User registration and login
- Create projects with a name, description, and status
- Select a registered user as project lead
- View projects and their project lead information
- Add registered users as project members
- Remove members from projects
- Prevent duplicate project memberships
- Prevent removal of the project lead
- Store users, projects, and memberships in MongoDB

## Technologies

- React
- Vite
- Node.js
- Express
- MongoDB

## Project Structure

- `client/` — React frontend
- `server/` — Express backend

## Running the Application

### 1. Configure the backend

Create a `server/.env` file containing your MongoDB connection string:

`MONGO_URI=your_mongodb_connection_string`

Replace the example value with your own connection string. Do not commit the `.env` file to GitHub.

### 2. Start the backend

From the project root, run:

`cd server`

`npm install`

`node server.js`

The backend runs on port 9000.

### 3. Start the frontend

Open a second terminal and run:

`cd ~/icsi418y-pa3/client`

`npm install`

`npm run dev`

Open the local URL displayed by Vite in your browser.

## Database Collections

- `users`
- `projects`
- `projectMemberships`

## Testing

The application has been tested for project creation, project listing, adding and removing members, rejecting duplicate membership requests, and preventing removal of a project lead.
