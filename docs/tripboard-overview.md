# Tripboard: Project Overview

Working title: Tripboard. The name can change later, the repo can be renamed at any time.

## One-Line Pitch

Tripboard is a travel planning web app that puts an entire trip in one clean, easy-to-follow place, with a map that shows every stop at a glance.

## The Problem

Trip information is scattered. Flight confirmations are in email, hotel bookings are in screenshots, the plan is in a Google Doc, costs are in a spreadsheet or nowhere, and the places themselves are saved across map apps. Finding "what am I doing Tuesday, where is it, is it booked, and what did it cost" means digging through several tools.

## The Solution

One trip workspace where everything is organized by day:

- Flights, stays, and activities as clear cards with times, locations, costs, and booking status
- A date range control to view the whole trip or zoom into a few days
- A map companion showing all stops as numbered pins connected in order
- A simple budget summary that updates as costs are added

It starts as a manual planner. Later versions add smart import of confirmations, travel-time awareness, collaboration, and other advanced features.

## Who It Is For

This is a personal and portfolio project with three audiences:

1. **Me**, as a tool for my own trips
2. **Recruiters and reviewers**, who should be able to open a live demo and quickly see a polished, working product
3. **Possible real users later**, if the project grows

## Goals

- Replace a Google Doc itinerary with something cleaner and easier to follow
- Aim to ship a working, deployed MVP in about 1 to 2 weeks (a target, not a hard deadline), then keep improving it. Quality comes before hitting the date
- Demonstrate full-stack skills: auth, database design, drag and drop, maps, time zones, and later AI document extraction
- Stay scoped: finish and polish a small product instead of half-building a large one

## Core Concept

The **itinerary is the product**. The main view is a day-by-day layout of trip items, each showing what it is, when, where, how much, and whether it is booked or paid. The **map is a companion**: a visual way to see the shape of the trip, kept in sync with the itinerary but not required to use the app.

A date range control changes what both views show, so users can look at the whole trip or a closer slice.

## Item Types (V1)

- **Flight**: departure and arrival locations, times, airline details
- **Stay**: check-in and check-out, address, one pin on the map
- **Activity**: a place at a time, including restaurants

Every item can have a cost, a booking status (idea, planned, or reserved), a payment status (unpaid or paid), a confirmation number, and notes.

## Version Roadmap

**V1: Core organizer (MVP, target of 1 to 2 weeks)**
Accounts, trips, itinerary items, day-by-day itinerary with drag and drop, date range control, map with pins and connecting lines, per-item costs with a budget summary, mobile-friendly layout, and a demo trip available without signing up.

**V2: Smart import**
Upload a confirmation PDF or screenshot, extract the details with an AI model, review and correct them, then add them to the itinerary. Includes duplicate detection and attaching the document to the item.

**V3: Smarter planning**
Travel time between stops with schedule warnings, free-time blocks, installable on a phone, and a shareable read-only trip page with private details hidden.

**Later and premium ideas**
Group trips and collaboration, expense splitting, activity recommendations, real routes and transit directions, email import, a during-trip "what's next" mode, and a native mobile app.

## Design Principles

- The itinerary is the product, the map is the companion
- Show the important details first, reveal the rest when an item is selected
- Simple trips stay simple, advanced features stay out of the way
- Phone friendly, because trip plans get used while traveling
- Noticeably cleaner than a spreadsheet or a document

## What Makes It Stand Out

- A clean, visual itinerary that can replace a Google Doc
- Status tracking that separates ideas, planned items, and reservations, with payment tracked separately
- A flexible item model that handles flights, stays, and activities without special cases
- A date range control that reshapes both the itinerary and the map
- In V2, document import with a human review step, which is more useful than a generic chatbot

## Out of Scope for Now

- Booking flights or hotels inside the app
- Payment processing
- Live flight tracking
- Notifications
- Social features
- Multi-currency conversion

## Success Criteria for V1

- I can plan a full trip end to end without a Google Doc
- The itinerary is easy to scan and edit on desktop and on a phone
- Costs and paid status roll up into a clear budget summary
- The map shows all stops and stays in sync with the itinerary
- Anyone can open the demo trip and understand it in under a minute
