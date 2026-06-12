class WindowManager {
  constructor() {
    this.windows = [];           // Array of all open Window objects
    this.nextZIndex = 100;       // Current highest z-index
    this.cascadeX = 50;          // Current cascade X position
    this.cascadeY = 50;          // Current cascade Y position
    this.cascadeOffset = 50;     // How much to offset each new window
    this.desktopElement = null;  // Where windows go in DOM
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
  }

  // Initialize the window manager with a desktop container
  init(desktopSelector) {
    this.desktopElement = document.querySelector(desktopSelector);
    if (!this.desktopElement) {
      console.error(`Desktop element not found: ${desktopSelector}`);
      return false;
    }
    console.log('WindowManager initialized');
    return true;
  }

  // Open a new game window
  openWindow(gameId, title, width, height) {
    // optional icon parameter in the 5th arg
    const icon = arguments.length >= 5 ? arguments[4] : null;
    // Check if game is already open
    const existingWindow = this.getGameWindow(gameId);
    if (existingWindow) {
      // Game already open, just focus it
      this.focusWindow(existingWindow.id);
      return existingWindow;
    }

    // Create new window with cascade position
    const windowObj = new Window({
      gameId: gameId,
      title: title,
      width: width || 800,
      height: height || 600,
      x: this.cascadeX,
      y: this.cascadeY,
      zIndex: this.nextZIndex
      ,
      icon: icon
    });

    // Add to windows array
    this.windows.push(windowObj);

    // let manager clean up when window requests close
    windowObj.onClose = () => this.closeWindow(windowObj.id);

    // Add to DOM
    this.desktopElement.appendChild(windowObj.getElement());

    // Update z-index for next window
    this.nextZIndex++;

    // Update cascade position for next window
    this.updateCascadePosition(width || 800, height || 600);

    // Make window draggable and resizable
    this.makeDraggable(windowObj);
    this.makeResizable(windowObj);

    // Add click listener to bring to focus
    windowObj.getElement().addEventListener('mousedown', () => {
      this.focusWindow(windowObj.id);
    });

    // Create taskbar item for this window
    this.createTaskbarItem(windowObj);

    console.log(`Window opened: ${title} (${windowObj.id})`);
    return windowObj;
  }

  // Close a window
  closeWindow(windowId) {
    const index = this.windows.findIndex(w => w.id === windowId);
    if (index !== -1) {
      const window = this.windows[index];
      // If not already destroyed by the window itself, destroy it
      if (!window._destroyed) {
        try { window.destroy(); } catch (e) { /* ignore */ }
      }
      // Remove taskbar item if present
      if (window.taskbarItem && window.taskbarItem.remove) window.taskbarItem.remove();
      this.windows.splice(index, 1); // Remove from array
      console.log(`Window closed: ${window.title}`);
    }
  }

  // Bring a window to front (focus)
  focusWindow(windowId) {
    const window = this.windows.find(w => w.id === windowId);
    if (!window) return;

    // Restore if minimized
    if (window.isMinimized) {
      window.restore();
    }

    // Set to highest z-index but keep below taskbar z-index so taskbar remains visible
    let taskbarZ = 10000;
    if (this.taskbarElement) {
      const z = getComputedStyle(this.taskbarElement).zIndex;
      taskbarZ = parseInt(z, 10) || taskbarZ;
    }
    const maxZForWindows = taskbarZ - 1;
    const zToUse = Math.min(this.nextZIndex, maxZForWindows);
    window.setZIndex(zToUse);
    if (this.nextZIndex < maxZForWindows) this.nextZIndex++;

    console.log(`Window focused: ${window.title}`);
    // update taskbar active state
    if (this.taskbarElement) this.updateTaskbarState(windowId, { focused: true, minimized: false });
  }

  // Minimize a window
  minimizeWindow(windowId) {
    const window = this.windows.find(w => w.id === windowId);
    if (window) {
      window.minimize();
      console.log(`Window minimized: ${window.title}`);
      if (this.taskbarElement) this.updateTaskbarState(windowId, { minimized: true, focused: false });
    }
  }

  // Restore a minimized window
  restoreWindow(windowId) {
    const window = this.windows.find(w => w.id === windowId);
    if (window) {
      window.restore();
      this.focusWindow(windowId); // Bring to front when restoring
      console.log(`Window restored: ${window.title}`);
    }
  }

  // Create a taskbar button for a window
  createTaskbarItem(windowObj) {
    if (!this.taskbarElement) return;
    const btn = document.createElement('button');
    btn.className = 'task-item';
    btn.dataset.windowId = windowObj.id;

    if (windowObj.icon) {
      const img = document.createElement('img');
      img.src = windowObj.icon;
      img.alt = windowObj.title;
      img.className = 'task-icon';
      btn.appendChild(img);
    }

    const label = document.createElement('span');
    label.className = 'task-label';
    //label.textContent = windowObj.title;
    btn.appendChild(label);

    // Click toggles minimize/restore or focuses
    btn.addEventListener('click', () => {
      if (windowObj.isMinimized) {
        this.restoreWindow(windowObj.id);
      } else {
        // If already focused, minimize; otherwise focus
        const isFront = windowObj.zIndex === this.nextZIndex - 1;
        if (isFront) this.minimizeWindow(windowObj.id);
        else this.focusWindow(windowObj.id);
      }
    });

    this.taskbarElement.appendChild(btn);
    windowObj.taskbarItem = btn;
    // mark initial active state
    this.updateTaskbarState(windowObj.id, { minimized: windowObj.isMinimized, focused: false });
  }

  // Update visual state of taskbar item
  updateTaskbarState(windowId, { minimized = false, focused = false } = {}) {
    const win = this.windows.find(w => w.id === windowId);
    if (!win || !win.taskbarItem) return;
    const btn = win.taskbarItem;
    if (minimized) btn.classList.add('minimized'); else btn.classList.remove('minimized');
    if (focused) btn.classList.add('active'); else btn.classList.remove('active');
  }

  // Check if a game is already open
  getGameWindow(gameId) {
    return this.windows.find(w => w.gameId === gameId);
  }

  // Get all open (non-minimized) windows
  getOpenWindows() {
    return this.windows.filter(w => !w.isMinimized);
  }

  // Get all windows (including minimized)
  getAllWindows() {
    return this.windows;
  }

  // Update cascade position for next window
  updateCascadePosition(width, height) {
    this.cascadeX += this.cascadeOffset;
    this.cascadeY += this.cascadeOffset;

    // Wrap around if reaching edge of screen
    if (this.cascadeX + width > this.screenWidth) {
      this.cascadeX = 50; // Reset to starting position
    }
    if (this.cascadeY + height > this.screenHeight) {
      this.cascadeY = 50; // Reset to starting position
    }
  }

  // Disable pointer events on all iframes (prevents them stealing mouse during drag/resize)
  _lockIframes() {
    document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'none');
  }

  _unlockIframes() {
    document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = '');
  }

  // Make a window draggable
  makeDraggable(windowObj) {
    const element = windowObj.getElement();
    const titlebar = element.querySelector('.titlebar');

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let offsetX = 0;
    let offsetY = 0;

    titlebar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.buttons')) return;
      if (windowObj.isMaximized) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      offsetX = windowObj.x;
      offsetY = windowObj.y;
      this._lockIframes();
      this.focusWindow(windowObj.id);
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const newX = offsetX + (e.clientX - startX);
      const newY = offsetY + (e.clientY - startY);
      windowObj.move(newX, newY);
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        this._unlockIframes();
      }
    });
  }

  // Make a window resizable via edge/corner handles
  makeResizable(windowObj) {
    const element = windowObj.getElement();
    const handles = element.querySelectorAll('.resize-handle');

    handles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        if (windowObj.isMaximized) return;
        e.preventDefault();
        e.stopPropagation();

        const dir = handle.dataset.dir;
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = windowObj.width;
        const startH = windowObj.height;
        const startLeft = windowObj.x;
        const startTop = windowObj.y;
        const minW = 200, minH = 120;

        this._lockIframes();
        this.focusWindow(windowObj.id);

        const onMove = (e) => {
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;

          let newW = startW, newH = startH, newX = startLeft, newY = startTop;

          if (dir.includes('e')) newW = Math.max(minW, startW + dx);
          if (dir.includes('s')) newH = Math.max(minH, startH + dy);
          if (dir.includes('w')) {
            newW = Math.max(minW, startW - dx);
            newX = startLeft + (startW - newW);
          }
          if (dir.includes('n')) {
            newH = Math.max(minH, startH - dy);
            newY = startTop + (startH - newH);
          }

          windowObj.move(newX, newY);
          windowObj.resize(newW, newH);
        };

        const onUp = () => {
          this._unlockIframes();
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });
  }

  // Close all windows
  closeAllWindows() {
    const windowIds = [...this.windows].map(w => w.id);
    windowIds.forEach(id => this.closeWindow(id));
    console.log('All windows closed');
  }
}

// Create global instance
const windowManager = new WindowManager();