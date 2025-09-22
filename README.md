# 🌐 LinkNest MDU - Professional Captive Portal System

## 🚀 Advanced WiFi Management for Multi-Dwelling Units

A production-ready captive portal system with dynamic speed control, built for hackathons and real-world deployment.

---

## ✨ Key Features

### 🔒 **True Captive Portal**
- Auto-redirect like hotels/airports
- Cross-platform device detection (Android/iOS/Windows)
- Seamless authentication flow

### ⚡ **Dynamic Speed Control**
- Real-time bandwidth management per device
- Plan-based speeds: Basic (25 Mbps), Standard (50 Mbps), Premium (100 Mbps)
- Individual device tracking and control

### 📱 **Multi-Device Support**
- Simultaneous connections with different speeds
- Device IP tracking and session management
- Real-time monitoring dashboard

### 🎯 **Professional Features**
- OTP-based email authentication
- PostgreSQL database integration
- WebSocket real-time updates
- Modern React TypeScript frontend
- RESTful API architecture

---

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile Device │────│  Captive Portal │────│   Admin Panel   │
│                 │    │                 │    │                 │
│ • Auto-redirect │    │ • Device detect │    │ • Real-time     │
│ • OTP auth      │    │ • Speed control │    │ • Monitoring    │
│ • Speed limits  │    │ • Session mgmt  │    │ • Management    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Windows 10/11 (for QoS)

### Installation
```bash
# Clone repository
git clone https://github.com/LakshaySingh2298/Linknest_MDU.git
cd Linknest_MDU

# Install dependencies
npm install

# Setup database
psql -U postgres -c "CREATE DATABASE linknest_db;"

# Start application
npm start
```

### Access Points
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Tenant Portal:** http://192.168.137.1:5173/tenant
- **Admin Dashboard:** http://192.168.137.1:5173/admin

---

## 📱 Usage Flow

### For Tenants
1. **Connect** to `LinkNest_WiFi` hotspot
2. **Auto-redirect** to captive portal
3. **Enter** phone number and unit
4. **Verify** OTP from email
5. **Enjoy** plan-based internet speeds

### For Admins
1. **Access** admin dashboard
2. **Monitor** real-time connections
3. **Manage** tenant plans and speeds
4. **View** network statistics

---

## 🔧 Technical Implementation

### Backend Stack
- **Express.js** - REST API server
- **PostgreSQL** - Database management
- **WebSocket** - Real-time communication
- **Windows QoS** - Speed control (simulation mode)

### Frontend Stack
- **React 18** - Modern UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Responsive design
- **Vite** - Fast development

### Network Control
- **Windows QoS Policies** - Per-device speed limiting
- **IP-based tracking** - Individual device management
- **Real-time updates** - Dynamic speed changes

---

## 🎯 Hackathon Highlights

### **Innovation**
- Real captive portal implementation
- Dynamic per-device speed control
- Professional hotel/airport-like experience

### **Technical Depth**
- Full-stack TypeScript application
- Real-time WebSocket communication
- Database-driven architecture
- Network-level speed control

### **Production Ready**
- Scalable architecture
- Error handling and logging
- Professional UI/UX design
- Complete documentation

---

## 🔍 Demo Features

### **Live Speed Control**
```bash
# Before OTP: 5 Mbps limit
Device 192.168.137.25 limited to 5 Mbps

# After OTP: Plan-based speed
Device 192.168.137.25 upgraded to 25 Mbps (Basic Plan)
```

### **Real-time Monitoring**
- Live device connections
- Speed limit status
- Network usage statistics
- Session management

---

## 🚀 Future Enhancements

- **Linux TC Integration** - Real bandwidth limiting
- **Router API Integration** - Hardware-level control
- **Mobile App** - Native authentication
- **Analytics Dashboard** - Usage insights

---

## 🏆 Built For Hackathons

This project demonstrates:
- **Full-stack development** skills
- **Network programming** expertise
- **Real-world application** design
- **Professional code** quality

---

## 📧 Contact

**Developer:** Lakshay Singh  
**GitHub:** [@LakshaySingh2298](https://github.com/LakshaySingh2298)  
**Project:** Professional Captive Portal System

---

**Built with ❤️ for hackathons and real-world deployment**
