# AYMAX Knowledge Hub

A knowledge management platform for SAP consulting teams, built on **SAP BTP** with the **SAP Cloud Application Programming Model (CAP)** and **SAPUI5**.

Consultants share procedures, best practices and lessons learned; managers validate the content before it is published; everyone can find knowledge, ask questions and identify experts from a single application.

> Prototype developed during a summer internship at **AYMAX** (July – September 2026) by a team of three interns.
> The application runs in SAP Business Application Studio with SQLite. SAP HANA Cloud and XSUAA are configured for production but not deployed yet.

## The problem

In an SAP consulting company, a lot of knowledge (SAP Basis procedures, incident fixes, best practices) is scattered across local documents, informal messages and people's memory. When a consultant or an intern leaves, part of that knowledge leaves with them. The goal of the Knowledge Hub is to centralize this knowledge, keep it reliable through a validation workflow, and make it easy to find.

## Features

**Knowledge center**
- Create and edit content (articles, tutorials, best practices, FAQ, templates…) with topics, tags and attachments
- Validation workflow: draft → pending → approved or rejected, decided by a manager
- Votes, comments and related content
- Reputation points and notifications for contributors

**Search and people**
- Cross-content search over knowledge, questions and experts, filtered by the user's permissions
- Expert directory and user profiles with skills, badges and certifications

**Collaboration**
- News feed, rooms, topics, tags, questions and answers

**Company features**
- Role-based dashboards (employee, manager, HR, administrator)
- HR module, rewards, certifications, intern deliverables and reports, administration

**Security**
- Five roles: Employee, Manager, HR, Administrator, Intern
- Authorization enforced on the server with CDS annotations (`@requires`, `@restrict`), including row-level filters — not only in the user interface

## Tech stack

| Layer | Technologies |
|---|---|
| User interface | SAPUI5 (freestyle, XML views, JavaScript controllers), SAP Fiori design (`sap_horizon`) |
| Services | SAP CAP on Node.js, OData V4 |
| Data model | CDS — 53 entities shared by the three modules |
| Database | SQLite in development, SAP HANA Cloud configured for production |
| Security | XSUAA (`xs-security.json`), mocked users in development |
| Platform and tools | SAP BTP, SAP Business Application Studio, MTA (`mta.yaml`), Git |

## Architecture

```
SAPUI5 user interface      app/webapp/  (one shell application, 19 routes)
        │  OData V4
CAP services               srv/*-service.cds   authorizations declared here
        │
Handlers                   srv/*-service.js, srv/handlers/
        │
Domain logic               srv/domain/, srv/lib/   workflow, reputation, notifications
        │
CDS data model             db/schema.cds, db/lot2.cds, db/lot3.cds
        │
SQLite (development)  /  SAP HANA Cloud (production)
```

Example — a manager approves a content item:
1. The UI calls the OData action `approveItem`.
2. CAP checks that the user has the Manager role.
3. The workflow checks that the transition from *pending* to *approved* is allowed.
4. The status is updated, the author gains reputation points and receives a notification.

## Project structure

| Folder | Content |
|---|---|
| `app/webapp/` | Main SAPUI5 application |
| `app/feed/` | Collaboration module (rooms, topics, questions) |
| `srv/` | CAP services, handlers and domain logic |
| `db/` | CDS data model and sample data |
| `xs-security.json` | Roles and scopes for XSUAA |
| `mta.yaml` | Deployment descriptor for SAP BTP |

## Getting started

**Requirements:** Node.js 20+ and the CAP development kit (`npm i -g @sap/cds-dk`), or SAP Business Application Studio.

```bash
npm install
cds watch
```

Then open `http://localhost:4004` and choose the `webapp` application.

In development, authentication is mocked. Five test users are defined in `package.json` (one per role), and a role selector at the top right of the application lets you switch between them. All authorization checks still run on the server.

## Team

| Module | Scope | Developer |
|---|---|---|
| Lot 1 — Collaboration | Feed, rooms, topics, tags, questions and answers | Nermine Latrous |
| Lot 2 — Knowledge | Knowledge center, search, experts, profiles, notifications, dashboards | Ons Chehab |
| Lot 3 — Company features | HR, rewards, certifications, deliverables, reports, validation, administration | Riadh |

Ons Chehab also set up the role-based security and integrated the three modules into a single application.

## Next steps

- Deploy to SAP BTP (HANA Cloud, XSUAA, approuter)
- Automated tests and a CI/CD pipeline
- Enforce the confidentiality level of content in the authorization rules
- Use the structured knowledge base for AI features (semantic search, duplicate question detection)
