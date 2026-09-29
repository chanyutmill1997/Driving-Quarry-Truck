/**
 * หน้าจอ AI ผู้ช่วยอัจฉริยะ (AI Copilot Chatbot View)
 */
class AICopilotView {
  constructor() {
    const today = new Date().toISOString().split('T')[0];
    this.dateFrom = today;
    this.dateTo = today;
  }

  setDateRange(from, to) {
    this.dateFrom = from || this.dateFrom;
    this.dateTo = to || this.dateTo;
    if (this.dateFrom > this.dateTo) this.dateTo = this.dateFrom;
    window.app.render();
  }

  render() {
    const history = window.quarryAI.chatHistory;

    return `
      <div class="max-w-4xl mx-auto space-y-4">
        
        <!-- Header -->
        <div class="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-blue-300 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg">
              🤖
            </div>
            <div>
              <h1 class="text-xl font-black text-white flex items-center gap-2">
                ผู้ช่วยวิเคราะห์ข้อมูลโรงโม่หิน
                <span class="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">ตอบจากข้อมูลระบบ</span>
              </h1>
              <p class="text-xs text-slate-400">เลือกช่วงวันที่แล้วถามจากข้อมูลการปฏิบัติงานจริงในระบบ</p>
            </div>
          </div>
          <button onclick="window.app.navigate('dashboard')" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700">
            <i data-lucide="arrow-left" class="w-4 h-4"></i> กลับแดชบอร์ด
          </button>
        </div>

        <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            <label class="text-xs font-bold text-slate-400">ตั้งแต่วันที่
              <input type="date" value="${this.dateFrom}" onchange="aiCopilotView.setDateRange(this.value, null)" class="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white">
            </label>
            <label class="text-xs font-bold text-slate-400">ถึงวันที่
              <input type="date" value="${this.dateTo}" onchange="aiCopilotView.setDateRange(null, this.value)" class="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white">
            </label>
          </div>
          <div class="flex gap-2">
            <button onclick="aiCopilotView.exportChat('excel')" class="px-3 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold">📊 Excel</button>
            <button onclick="aiCopilotView.exportChat('pdf')" class="px-3 py-2 bg-red-700 text-white rounded-xl text-xs font-bold">📄 PDF</button>
          </div>
        </div>

        <!-- Quick Question Prompts -->
        <div class="flex flex-wrap gap-2">
          <button onclick="aiCopilotView.sendQuick('วันนี้วิ่งไปกี่เที่ยว ยอดรวมเท่าไหร่')" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 rounded-xl text-xs text-slate-300 font-semibold transition">
            📊 สรุปยอดรวมวันนี้
          </button>
          <button onclick="aiCopilotView.sendQuick('ใครวิ่งได้เยอะที่สุดวันนี้')" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 rounded-xl text-xs text-slate-300 font-semibold transition">
            🏆 ใครวิ่งเยอะสุด
          </button>
          <button onclick="aiCopilotView.sendQuick('รถคันไหนจอดไม่ได้วิ่งบ้าง')" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 rounded-xl text-xs text-slate-300 font-semibold transition">
            🛑 รถคันไหนจอดบ้าง
          </button>
          <button onclick="aiCopilotView.sendQuick('ช่วยตรวจหาความผิดปกติของวันนี้ให้หน่อย')" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 rounded-xl text-xs text-blue-400 font-semibold transition">
            ⚠️ ตรวจสอบความผิดปกติ
          </button>
          <button onclick="aiCopilotView.sendQuick('ขอตารางเรทราคาวิ่งหิน')" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 rounded-xl text-xs text-slate-300 font-semibold transition">
            💰 เรทราคาค่าเที่ยว
          </button>
        </div>

        <!-- Chat Container -->
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col h-[520px]">
          
          <!-- Message Thread -->
          <div id="ai-chat-thread" class="flex-1 overflow-y-auto space-y-4 pr-2">
            ${history.map(msg => `
              <div class="flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}">
                ${msg.sender === 'ai' ? `
                  <div class="w-8 h-8 rounded-xl bg-blue-500 text-slate-950 flex items-center justify-center font-bold text-sm flex-shrink-0 shadow">
                    🤖
                  </div>
                ` : ''}

                <div class="max-w-lg ${msg.sender === 'user' ? 'bg-blue-500 text-slate-950 rounded-2xl rounded-tr-none font-medium' : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-2xl rounded-tl-none'} p-4 text-xs shadow-md space-y-1">
                  <div class="whitespace-pre-line leading-relaxed">${msg.text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</div>
                  <p class="text-[9px] ${msg.sender === 'user' ? 'text-slate-800' : 'text-slate-500'} text-right">${msg.time}</p>
                </div>

                ${msg.sender === 'user' ? `
                  <div class="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    👤
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>

          <!-- Input Bar -->
          <div class="pt-4 border-t border-slate-800 mt-2 flex items-center gap-2">
            <input type="text" id="ai-input-box" onkeypress="if(event.key==='Enter') aiCopilotView.handleSend()" placeholder="พิมพ์คำถามที่นี่ เช่น สรุปยอดวันนี้, รถคันไหนจอดบ้าง..." class="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <button onclick="aiCopilotView.handleSend()" class="px-5 py-3 bg-blue-500 hover:bg-blue-400 active:scale-95 text-slate-950 rounded-2xl font-black text-xs shadow-lg transition flex items-center gap-1.5">
              <i data-lucide="send" class="w-4 h-4"></i> ส่ง
            </button>
          </div>

        </div>

      </div>
    `;
  }

  handleSend() {
    const input = document.getElementById('ai-input-box');
    const text = input ? input.value.trim() : '';
    if (!text) return;

    window.quarryAI.ask(text, { dateFrom: this.dateFrom, dateTo: this.dateTo });
    input.value = '';
    window.app.render();

    // Scroll to bottom
    setTimeout(() => {
      const thread = document.getElementById('ai-chat-thread');
      if (thread) thread.scrollTop = thread.scrollHeight;
    }, 100);
  }

  sendQuick(text) {
    window.quarryAI.ask(text, { dateFrom: this.dateFrom, dateTo: this.dateTo });
    window.app.render();

    setTimeout(() => {
      const thread = document.getElementById('ai-chat-thread');
      if (thread) thread.scrollTop = thread.scrollHeight;
    }, 100);
  }

  exportChat(format) {
    const history = window.quarryAI.chatHistory || [];
    const rows = history.map((msg, index) => ({
      "ลำดับ": index + 1,
      "ผู้ส่ง": msg.sender === 'user' ? 'ผู้ใช้' : 'AI ผู้ช่วย',
      "ข้อความ": msg.text.replace(/\*\*/g, ''),
      "เวลา": msg.time,
      "ช่วงวันที่": `${this.dateFrom} ถึง ${this.dateTo}`
    }));
    const fileBase = `AI_ผู้ช่วย_${this.dateFrom}_ถึง_${this.dateTo}`;
    if (format === 'excel') {
      const sheet = XLSX.utils.json_to_sheet(rows);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, 'AI ผู้ช่วย');
      XLSX.writeFile(book, `${fileBase}.xlsx`);
      return;
    }
    const container = document.createElement('div');
    container.innerHTML = `<div style="font-family:Tahoma,sans-serif;padding:24px;color:#0f172a"><h1>รายงานการสนทนา AI ผู้ช่วย</h1><p>ช่วงวันที่ ${this.dateFrom} ถึง ${this.dateTo}</p>${rows.map(r => `<div style="margin:12px 0;padding:12px;border:1px solid #cbd5e1;border-radius:8px"><b>${r['ผู้ส่ง']}</b><p style="white-space:pre-line">${r['ข้อความ']}</p><small>${r['เวลา']}</small></div>`).join('')}</div>`;
    html2pdf().set({ filename: `${fileBase}.pdf`, margin: 8, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(container).save();
  }
}

window.aiCopilotView = new AICopilotView();
