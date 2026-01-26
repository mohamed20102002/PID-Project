#!/usr/bin/env python3
"""
Simple Dev Server Manager GUI
"""

import subprocess
import sys
import os
import re
import threading
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox

# Common dev server ports (safe to kill)
DEV_PORTS = [
    3000, 3001, 3002, 3003,  # React, Next.js
    4200, 4201,              # Angular
    5173, 5174, 5175,        # Vite
    8000, 8080, 8888,        # Python, general dev
    9000, 9001,              # Various dev servers
]

# Main project port
MAIN_PORT = 5173

class DevServerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Dev Server Manager")
        self.root.geometry("500x450")
        self.root.configure(bg='#2d2d2d')
        self.root.resizable(True, True)

        self.process = None
        self.create_widgets()
        self.refresh_servers()
        self.auto_refresh()

    def create_widgets(self):
        # Main container
        main = tk.Frame(self.root, bg='#2d2d2d', padx=15, pady=15)
        main.pack(fill=tk.BOTH, expand=True)

        # === STATUS INDICATOR ===
        status_frame = tk.Frame(main, bg='#2d2d2d')
        status_frame.pack(fill=tk.X, pady=(0, 15))

        tk.Label(status_frame, text="Project Server (Port 5173):",
                 font=('Arial', 11, 'bold'), bg='#2d2d2d', fg='white').pack(side=tk.LEFT)

        self.status_lamp = tk.Canvas(status_frame, width=20, height=20,
                                      bg='#2d2d2d', highlightthickness=0)
        self.status_lamp.pack(side=tk.LEFT, padx=(10, 5))
        self.lamp_circle = self.status_lamp.create_oval(2, 2, 18, 18, fill='#555555', outline='#333333')

        self.status_label = tk.Label(status_frame, text="Stopped",
                                      font=('Arial', 10), bg='#2d2d2d', fg='#888888')
        self.status_label.pack(side=tk.LEFT)

        # === START SERVER SECTION ===
        start_frame = tk.LabelFrame(main, text=" Start Server ", font=('Arial', 10, 'bold'),
                                    bg='#2d2d2d', fg='white', padx=10, pady=10)
        start_frame.pack(fill=tk.X, pady=(0, 10))

        port_row = tk.Frame(start_frame, bg='#2d2d2d')
        port_row.pack(fill=tk.X)

        tk.Label(port_row, text="Port:", bg='#2d2d2d', fg='white',
                 font=('Arial', 10)).pack(side=tk.LEFT)

        self.port_entry = tk.Entry(port_row, width=8, font=('Arial', 11),
                                   bg='#3d3d3d', fg='white', insertbackground='white')
        self.port_entry.insert(0, "5173")
        self.port_entry.pack(side=tk.LEFT, padx=(10, 15))

        self.start_btn = tk.Button(port_row, text="▶ Start", font=('Arial', 10, 'bold'),
                                   bg='#4caf50', fg='white', padx=15, pady=3,
                                   cursor='hand2', command=self.start_server)
        self.start_btn.pack(side=tk.LEFT, padx=(0, 5))

        self.stop_btn = tk.Button(port_row, text="⏹ Stop", font=('Arial', 10, 'bold'),
                                  bg='#f44336', fg='white', padx=15, pady=3,
                                  cursor='hand2', command=self.stop_server, state=tk.DISABLED)
        self.stop_btn.pack(side=tk.LEFT, padx=(0, 10))

        tk.Button(port_row, text="📦 npm i", font=('Arial', 9),
                  bg='#9c27b0', fg='white', padx=10, pady=3, cursor='hand2',
                  command=self.npm_install).pack(side=tk.LEFT)

        # === RUNNING DEV SERVERS ===
        servers_frame = tk.LabelFrame(main, text=" Running Dev Servers (safe to kill) ",
                                      font=('Arial', 10, 'bold'),
                                      bg='#2d2d2d', fg='white', padx=10, pady=10)
        servers_frame.pack(fill=tk.X, pady=(0, 10))

        list_frame = tk.Frame(servers_frame, bg='#2d2d2d')
        list_frame.pack(fill=tk.X)

        self.server_list = tk.Listbox(list_frame, height=3, font=('Consolas', 10),
                                      bg='#1e1e1e', fg='#4fc3f7', selectbackground='#0066cc',
                                      selectforeground='white')
        self.server_list.pack(side=tk.LEFT, fill=tk.X, expand=True)

        btn_row = tk.Frame(servers_frame, bg='#2d2d2d')
        btn_row.pack(fill=tk.X, pady=(8, 0))

        tk.Button(btn_row, text="🔄 Refresh", font=('Arial', 9),
                  bg='#607d8b', fg='white', padx=12, cursor='hand2',
                  command=self.refresh_servers).pack(side=tk.LEFT, padx=(0, 8))

        tk.Button(btn_row, text="❌ Kill Selected", font=('Arial', 9),
                  bg='#ff5722', fg='white', padx=12, cursor='hand2',
                  command=self.kill_selected).pack(side=tk.LEFT)

        # === LOGS ===
        logs_frame = tk.LabelFrame(main, text=" Logs ", font=('Arial', 10, 'bold'),
                                   bg='#2d2d2d', fg='white', padx=10, pady=10)
        logs_frame.pack(fill=tk.BOTH, expand=True)

        self.logs_text = scrolledtext.ScrolledText(logs_frame, font=('Consolas', 9),
                                                    bg='#1e1e1e', fg='#aaaaaa',
                                                    insertbackground='white', height=8)
        self.logs_text.pack(fill=tk.BOTH, expand=True)

        self.logs_text.tag_config('error', foreground='#f44336')
        self.logs_text.tag_config('success', foreground='#4caf50')
        self.logs_text.tag_config('info', foreground='#4fc3f7')

    def log(self, message, tag='info'):
        self.logs_text.insert(tk.END, message + '\n', tag)
        self.logs_text.see(tk.END)

    def update_status_lamp(self):
        """Update the status lamp for main port"""
        servers = self.get_running_servers()
        main_running = any(port == MAIN_PORT for port, _ in servers)

        if main_running:
            self.status_lamp.itemconfig(self.lamp_circle, fill='#4caf50', outline='#2e7d32')
            self.status_label.config(text="Running", fg='#4caf50')
        else:
            self.status_lamp.itemconfig(self.lamp_circle, fill='#555555', outline='#333333')
            self.status_label.config(text="Stopped", fg='#888888')

    def get_running_servers(self):
        """Get list of running dev servers (only safe dev ports)"""
        servers = []
        try:
            result = subprocess.run(
                ['netstat', '-ano'],
                capture_output=True, text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
            )

            for line in result.stdout.split('\n'):
                if 'LISTENING' in line:
                    match = re.search(r':(\d+)\s+.*LISTENING\s+(\d+)', line)
                    if match:
                        port = int(match.group(1))
                        pid = match.group(2)
                        # Only include known dev server ports
                        if port in DEV_PORTS:
                            servers.append((port, pid))
        except Exception as e:
            self.log(f"Error: {e}", 'error')

        return sorted(servers)

    def refresh_servers(self):
        self.server_list.delete(0, tk.END)
        servers = self.get_running_servers()

        if servers:
            for port, pid in servers:
                marker = " ⬅ PROJECT" if port == MAIN_PORT else ""
                self.server_list.insert(tk.END, f"  Port {port}  (PID: {pid}){marker}")
        else:
            self.server_list.insert(tk.END, "  No dev servers running")

        self.update_status_lamp()

    def auto_refresh(self):
        """Auto refresh status lamp every 3 seconds"""
        self.update_status_lamp()
        self.root.after(3000, self.auto_refresh)

    def kill_selected(self):
        selection = self.server_list.curselection()
        if not selection:
            messagebox.showwarning("Warning", "Select a server to kill")
            return

        text = self.server_list.get(selection[0])
        if "No dev servers" in text:
            return

        match = re.search(r'PID:\s*(\d+)', text)
        if match:
            pid = match.group(1)
            try:
                subprocess.run(['taskkill', '/F', '/PID', pid],
                             capture_output=True,
                             creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0)
                self.log(f"Killed server (PID {pid})", 'success')
                self.refresh_servers()
            except Exception as e:
                self.log(f"Error: {e}", 'error')

    def start_server(self):
        port = self.port_entry.get().strip()
        if not port.isdigit():
            messagebox.showwarning("Warning", "Enter a valid port number")
            return

        servers = self.get_running_servers()
        for p, _ in servers:
            if p == int(port):
                messagebox.showwarning("Warning", f"Port {port} is already in use!")
                return

        self.log(f"Starting server on port {port}...", 'info')
        self.start_btn.config(state=tk.DISABLED)
        self.stop_btn.config(state=tk.NORMAL)

        def run_server():
            try:
                self.process = subprocess.Popen(
                    f'npm run dev -- --port {port}',
                    shell=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    cwd=os.path.dirname(os.path.abspath(__file__)),
                    creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
                )

                for line in iter(self.process.stdout.readline, b''):
                    if line:
                        text = line.decode('utf-8', errors='ignore').strip()
                        if text:
                            tag = 'error' if 'error' in text.lower() else 'info'
                            self.root.after(0, lambda t=text, tg=tag: self.log(t, tg))

                self.root.after(0, self.on_server_stopped)

            except Exception as e:
                self.root.after(0, lambda: self.log(f"Error: {e}", 'error'))
                self.root.after(0, self.on_server_stopped)

        threading.Thread(target=run_server, daemon=True).start()
        self.root.after(2000, self.refresh_servers)

    def on_server_stopped(self):
        self.start_btn.config(state=tk.NORMAL)
        self.stop_btn.config(state=tk.DISABLED)
        self.process = None
        self.refresh_servers()

    def stop_server(self):
        if self.process:
            self.log("Stopping server...", 'info')
            try:
                subprocess.run(['taskkill', '/F', '/T', '/PID', str(self.process.pid)],
                             capture_output=True,
                             creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0)
                self.log("Server stopped", 'success')
            except Exception as e:
                self.log(f"Error: {e}", 'error')
            self.on_server_stopped()

    def npm_install(self):
        self.log("Running npm install...", 'info')

        def run_install():
            try:
                process = subprocess.Popen(
                    'npm install',
                    shell=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    cwd=os.path.dirname(os.path.abspath(__file__)),
                    creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
                )

                for line in iter(process.stdout.readline, b''):
                    if line:
                        text = line.decode('utf-8', errors='ignore').strip()
                        if text:
                            tag = 'error' if 'error' in text.lower() else 'info'
                            self.root.after(0, lambda t=text, tg=tag: self.log(t, tg))

                process.wait()
                self.root.after(0, lambda: self.log("npm install completed!", 'success'))

            except Exception as e:
                self.root.after(0, lambda: self.log(f"Error: {e}", 'error'))

        threading.Thread(target=run_install, daemon=True).start()

def main():
    root = tk.Tk()
    DevServerGUI(root)
    root.mainloop()

if __name__ == '__main__':
    main()
