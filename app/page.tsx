'use client';
import { useState, useRef } from 'react';

const KASHMIRI_TITHIS = [
  "Okdoh", "Doy", "Trey", "Choram", "Pancham", "Shish", "Saptam", "Aetham", "Navam", "Daham", "Kah", "Bah", "Truvah", "Tshodah"
];

const MONTH_NAMES = [
  "Chaitra", "Vaisakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",
  "Ashvina", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"
];

export default function ShraadApp() {
  const [activeTab, setActiveTab] = useState(0); 
  const [showWelcome, setShowWelcome] = useState(true);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('general');

  // Standard Calc
  const [personName, setPersonName] = useState("");
  const [deathDate, setDeathDate] = useState("2020-10-02");
  const [targetYear, setTargetYear] = useState(new Date().getFullYear().toString());
  const [knowsTime, setKnowsTime] = useState(false);
  const [deathHour, setDeathHour] = useState("01");
  const [deathMin, setDeathMin] = useState("00");
  const [deathAmPm, setDeathAmPm] = useState("AM");
  
  const [calcData, setCalcData] = useState<any>(null);
  const [loadingCalc, setLoadingCalc] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Reverse Calc
  const [revName, setRevName] = useState("");
  const [revYear, setRevYear] = useState("1989");
  const [revMonth, setRevMonth] = useState("Kartika");
  const [revPaksha, setRevPaksha] = useState("Gat Pachh (Krishna)");
  const [revTithi, setRevTithi] = useState("Bah");

  const [revData, setRevData] = useState<any>(null);
  const [loadingRev, setLoadingRev] = useState(false);
  const revResultsRef = useRef<HTMLDivElement>(null);

  // IMPORTANT: Replace this with your Hugging Face Direct URL
  const API_URL = "https://shashankkaw-shraad-api.hf.space";
  const APP_URL = "https://shraad-alert.vercel.app";

  const tithiOpts = [...KASHMIRI_TITHIS, revPaksha.includes("Zoon") ? "Purnima" : "Mawas (Amavasya)"];

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingCalc(true);
    
    let timeStr = null;
    if (knowsTime) {
      let hr = parseInt(deathHour);
      if (deathAmPm === "PM" && hr !== 12) hr += 12;
      if (deathAmPm === "AM" && hr === 12) hr = 0;
      timeStr = `${String(hr).padStart(2, '0')}:${deathMin}`;
    }

    try {
      const res = await fetch(`${API_URL}/api/calculate_shraad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soul_name: personName,
          death_date: deathDate,
          knows_time: knowsTime,
          death_time: timeStr,
          target_year: parseInt(targetYear)
        }),
      });
      const data = await res.json();
      setCalcData(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
    } catch (err) {
      alert("Error connecting to backend API.");
    }
    setLoadingCalc(false);
  };

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingRev(true);
    try {
      const res = await fetch(`${API_URL}/api/reverse_lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soul_name: revName,
          rev_year: parseInt(revYear),
          rev_month_name: revMonth,
          rev_paksha: revPaksha,
          rev_tithi_name: revTithi
        }),
      });
      const data = await res.json();
      setRevData(data);
      setTimeout(() => revResultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
    } catch (err) {
      alert("Error connecting to backend API.");
    }
    setLoadingRev(false);
  };

  const triggerTransfer = (rawDt: string) => {
    setDeathDate(rawDt);
    setPersonName(revName);
    setActiveTab(0);
  };

  const generateGCalUrl = (rawDate: string, name: string) => {
    if (!rawDate) return "#";
    const startStr = rawDate.replace(/-/g, '') + 'T023000Z';
    const endStr = rawDate.replace(/-/g, '') + 'T073000Z';
    const title = `Shraad${name ? ' for ' + name : ''}`;
    const details = "Calculated via Kashmiri Hindu Shraad Calculator based on Vijayshwar Jantri rules.";
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(details)}`;
  };

  const downloadICS = (rawDate: string, name: string) => {
    if (!rawDate) return;
    const startStr = rawDate.replace(/-/g, '') + 'T023000Z';
    const endStr = rawDate.replace(/-/g, '') + 'T073000Z';
    const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const title = `Shraad${name ? ' for ' + name : ''}`;
    const icsData = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Kashmiri Shraad Calculator//EN\r\nBEGIN:VEVENT\r\nUID:${nowStr}@kashmirishraad.com\r\nDTSTAMP:${nowStr}\r\nDTSTART:${startStr}\r\nDTEND:${endStr}\r\nSUMMARY:${title}\r\nDESCRIPTION:Calculated via Kashmiri Hindu Shraad Calculator based on Vijayshwar Jantri rules.\r\nEND:VEVENT\r\nEND:VCALENDAR`;
    const blob = new Blob([icsData], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shraad_${rawDate.substring(0, 4)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFeedbackSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get('fb_email');
    if (!email) { alert("Please provide your email."); return; }
    
    let subject = feedbackType === "bug" ? "Bug Report: Shraad Calculator" : "Feedback: Shraad Calculator";
    let body = `User Email: ${email}\n\n`;
    if (feedbackType === "bug") {
      body += `--- BUG REPORT ---\nActual Date: ${fd.get('fb_dob')}\nExpected: ${fd.get('fb_expected')}\nApp Result: ${fd.get('fb_actual')}\nNotes: ${fd.get('fb_notes')}`;
    } else {
      body += `--- FEEDBACK ---\n${fd.get('fb_text')}`;
    }
    window.location.href = `mailto:kawshashank@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setIsFeedbackOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#111111] text-stone-100 font-sans p-4 sm:p-8 flex flex-col items-center">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes subtleFadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .anim-fade-up { animation: subtleFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        html { scroll-behavior: smooth; }
      `}} />

      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-amber-600/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-orange-900/10 blur-[120px]"></div>
      </div>

      {/* Welcome Modal */}
      {showWelcome && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4">
          <div className="bg-stone-900 border border-amber-600/30 w-full max-w-lg rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-serif font-bold text-amber-500 mb-4 text-center">🙏 Welcome to the Kashmiri Shraad Calculator</h2>
            <p className="text-stone-300 text-sm text-center mb-6">Mathematically aligned with the authentic Vijayshwar Jantri.</p>
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-stone-800/50 p-4 rounded-xl border border-stone-700">
                <span className="text-2xl">📅</span>
                <div>
                  <h4 className="text-amber-400 font-bold text-sm">Search Shraad Date</h4>
                  <p className="text-stone-400 text-xs">Find the exact Shraad date for any upcoming year.</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-stone-800/50 p-4 rounded-xl border border-stone-700">
                <span className="text-2xl">⏪</span>
                <div>
                  <h4 className="text-amber-400 font-bold text-sm">Reverse Date Lookup</h4>
                  <p className="text-stone-400 text-xs">Find the historical English date using traditional Tithis.</p>
                </div>
              </div>
            </div>
            <button onClick={() => setShowWelcome(false)} className="w-full mt-6 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg transition-colors">
              Proceed to Calculator ✨
            </button>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-stone-900 border border-amber-600/30 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-stone-800">
              <h3 className="font-serif font-bold text-lg text-amber-500">💬 Support & Feedback</h3>
              <button onClick={() => setIsFeedbackOpen(false)} className="text-stone-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleFeedbackSubmit} className="p-6 space-y-4">
               <div className="flex gap-4 mb-4 text-sm">
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="type" value="general" checked={feedbackType === 'general'} onChange={() => setFeedbackType('general')} className="mr-2 accent-amber-500"/> General
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="type" value="bug" checked={feedbackType === 'bug'} onChange={() => setFeedbackType('bug')} className="mr-2 accent-amber-500"/> Report Bug
                  </label>
               </div>
               <input type="email" name="fb_email" placeholder="Your Email (name@example.com)" className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-sm text-white" required />
               {feedbackType === 'bug' ? (
                 <div className="space-y-3">
                   <input type="text" name="fb_dob" placeholder="Actual Date of Passing (e.g. 22 Jan 1960)" className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-sm text-white" />
                   <input type="text" name="fb_expected" placeholder="Expected Result as per Jantri" className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-sm text-white" />
                   <input type="text" name="fb_actual" placeholder="Result App Gave You" className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-sm text-white" />
                   <textarea name="fb_notes" placeholder="Extra context..." rows={2} className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-sm text-white"></textarea>
                 </div>
               ) : (
                 <textarea name="fb_text" placeholder="Your feedback..." rows={4} className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-sm text-white" required></textarea>
               )}
               <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg transition-colors">Send via Email</button>
            </form>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-amber-500 leading-tight">Kashmiri Hindu<br/>Shraad Calculator</h1>
          <p className="text-amber-700/80 mt-2">◈ ─── ॐ ─── ◈</p>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          
          {/* Custom Tabs */}
          <div className="flex border-b border-stone-800">
            <button onClick={() => setActiveTab(0)} className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 0 ? 'bg-amber-600/20 border-b-2 border-amber-500 text-amber-400' : 'text-stone-500 hover:bg-stone-800/50'}`}>
              Search Shraad
            </button>
            <button onClick={() => setActiveTab(1)} className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 1 ? 'bg-amber-600/20 border-b-2 border-amber-500 text-amber-400' : 'text-stone-500 hover:bg-stone-800/50'}`}>
              Reverse Lookup
            </button>
          </div>

          {/* TAB 1: STANDARD */}
          {activeTab === 0 && (
            <div className="p-6 sm:p-8 anim-fade-up">
              <form onSubmit={handleStandardSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-400 font-bold mb-2">Name of Departed Soul (Optional)</label>
                  <input type="text" value={personName} onChange={(e) => setPersonName(e.target.value)} className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none" placeholder="e.g. Ram" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-stone-400 font-bold mb-2">Date of Passing</label>
                    <input type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-stone-400 font-bold mb-2">Find Shraad For Year</label>
                    <input type="number" value={targetYear} onChange={(e) => setTargetYear(e.target.value)} className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none" min="2024" max="2100" />
                  </div>
                </div>

                <div className="bg-stone-800/50 border border-stone-700 p-4 rounded-xl">
                  <label className="flex items-center space-x-3 cursor-pointer mb-2">
                    <input type="checkbox" checked={knowsTime} onChange={(e) => setKnowsTime(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                    <span className="text-sm font-semibold text-stone-300">I know the exact time of passing</span>
                  </label>
                  
                  {knowsTime && (
                    <div className="grid grid-cols-3 gap-3 mt-4 anim-fade-up">
                      <select value={deathHour} onChange={(e) => setDeathHour(e.target.value)} className="bg-stone-800 border border-stone-700 rounded-lg p-2 text-white">
                        {Array.from({length: 12}, (_, i) => <option key={i+1} value={String(i+1).padStart(2, '0')}>{String(i+1).padStart(2, '0')}</option>)}
                      </select>
                      <select value={deathMin} onChange={(e) => setDeathMin(e.target.value)} className="bg-stone-800 border border-stone-700 rounded-lg p-2 text-white">
                        {Array.from({length: 60}, (_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>)}
                      </select>
                      <select value={deathAmPm} onChange={(e) => setDeathAmPm(e.target.value)} className="bg-stone-800 border border-stone-700 rounded-lg p-2 text-white">
                        <option>AM</option><option>PM</option>
                      </select>
                    </div>
                  )}
                  {!knowsTime && <p className="text-xs text-stone-500 mt-2">If unknown, the calculation evaluates standard Sunrise boundary options.</p>}
                </div>

                <div className="flex gap-4 pt-2">
                  <button type="submit" disabled={loadingCalc} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg transition-colors">
                    {loadingCalc ? "Analyzing..." : "Calculate Shraad Date"}
                  </button>
                  <button type="button" onClick={() => setIsFeedbackOpen(true)} className="px-4 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-lg transition-colors text-stone-300">
                    💬
                  </button>
                </div>
              </form>

              {/* Standard Results */}
              <div ref={resultsRef} className="scroll-mt-8">
                {calcData?.success && (
                  <div className="mt-8 space-y-6 border-t border-stone-800 pt-8 anim-fade-up">
                    {calcData.results.map((res: any, idx: number) => (
                      <div key={idx} className="bg-stone-800/40 border border-amber-600/30 p-6 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                        
                        {res.scenario_type === 'predawn' && <p className="text-amber-400 text-sm font-bold mb-2">🌙 If passing occurred BEFORE dawn (~6:30 AM)</p>}
                        {res.scenario_type === 'postdawn' && <p className="text-amber-400 text-sm font-bold mb-2">☀️ If passing occurred AFTER dawn (~6:30 AM)</p>}
                        {res.scenario_type === 'exact' && <p className="text-amber-400 text-sm font-bold mb-2">{res.is_predawn ? "🌙 Time is before dawn. Anchored to previous Hindu day." : "☀️ Anchored to today's Hindu day."}</p>}

                        <div className="flex flex-col sm:flex-row justify-between mb-4 gap-2">
                          <div className="bg-stone-900/50 p-2 rounded border border-stone-700 text-xs">
                            <span className="text-stone-500 block uppercase tracking-widest">Lunar Masa</span>
                            <span className="text-white font-bold">{res.lunar_masa}</span>
                          </div>
                          <div className="bg-stone-900/50 p-2 rounded border border-stone-700 text-xs">
                            <span className="text-stone-500 block uppercase tracking-widest">Official Tithi</span>
                            <span className="text-white font-bold">{res.official_tithi}</span>
                          </div>
                        </div>

                        {res.shraad_date_str ? (
                          <>
                            <div className="text-center py-4 bg-black/40 rounded-lg border border-amber-600/20 mb-4">
                              <span className="text-amber-600 text-xl">ॐ</span>
                              <p className="text-stone-400 text-xs uppercase tracking-widest mt-1">Calculated Shraad Date</p>
                              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-amber-400 mt-1">{res.shraad_date_str}</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                              <a href={generateGCalUrl(res.shraad_raw_date, personName)} target="_blank" rel="noreferrer" className="text-center bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-sm py-2 rounded-lg transition-colors">🗓️ Add to Google Calendar</a>
                              <button onClick={() => downloadICS(res.shraad_raw_date, personName)} className="text-center bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-sm py-2 rounded-lg transition-colors">📥 Download .ics</button>
                            </div>

                            <details className="bg-stone-900/80 border border-stone-700 rounded-lg group">
                              <summary className="cursor-pointer p-4 text-sm font-semibold text-amber-500 outline-none">📅 View Upcoming Dates (Next 5 Years)</summary>
                              <ul className="p-4 pt-0 space-y-2 text-sm">
                                {res.future_dates.map((fd: any, fIdx: number) => (
                                  <li key={fIdx} className="flex justify-between border-b border-stone-700/50 pb-2">
                                    <span className="text-amber-600/80 font-bold">{fd.year}</span>
                                    <span className="text-stone-300">{fd.date}</span>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          </>
                        ) : (
                          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">Could not accurately resolve a structural date match.</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: REVERSE LOOKUP */}
          {activeTab === 1 && (
            <div className="p-6 sm:p-8 anim-fade-up">
              <div className="mb-6">
                <p className="text-sm text-stone-400">If you know the traditional Kashmiri Tithi and the year of passing, you can find the exact calendar date.</p>
              </div>

              <form onSubmit={handleReverseSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-400 font-bold mb-2">Name of Departed Soul (Optional)</label>
                  <input type="text" value={revName} onChange={(e) => setRevName(e.target.value)} className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none" placeholder="e.g. Sita" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-stone-400 font-bold mb-2">Year of Passing</label>
                    <input type="number" value={revYear} onChange={(e) => setRevYear(e.target.value)} className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none" min="1930" max="2100" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-stone-400 font-bold mb-2">Lunar Month (Masa)</label>
                    <select value={revMonth} onChange={(e) => setRevMonth(e.target.value)} className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none">
                      {MONTH_NAMES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-stone-400 font-bold mb-2">Lunar Phase (Paksha)</label>
                    <select value={revPaksha} onChange={(e) => setRevPaksha(e.target.value)} className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none">
                      <option>Zoon Pachh (Shukla)</option>
                      <option>Gat Pachh (Krishna)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-stone-400 font-bold mb-2">Tithi</label>
                    <select value={revTithi} onChange={(e) => setRevTithi(e.target.value)} className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none">
                      {tithiOpts.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button type="submit" disabled={loadingRev} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg transition-colors">
                    {loadingRev ? "Scanning..." : "Find Exact Date"}
                  </button>
                  <button type="button" onClick={() => setIsFeedbackOpen(true)} className="px-4 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-lg transition-colors text-stone-300">
                    💬
                  </button>
                </div>
              </form>

              {/* Reverse Results */}
              <div ref={revResultsRef} className="scroll-mt-8">
                {revData?.success && (
                  <div className="mt-8 space-y-4 border-t border-stone-800 pt-8 anim-fade-up">
                    {revData.matches.length === 0 ? (
                       <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">Could not find any day in {revData.year} where this Tithi was active at sunrise. It may have been a Kshaya (skipped) Tithi.</div>
                    ) : (
                      <>
                        {revData.matches.length > 1 && <p className="text-amber-500 text-sm">This was a <b>Devadev</b> (Double Tithi). Active on two consecutive days:</p>}
                        
                        {revData.matches.map((m: any, i: number) => (
                          <div key={i} className="bg-black/40 border border-amber-600/30 p-6 rounded-xl text-center">
                             <span className="text-amber-600 text-xl">ॐ</span>
                             <p className="text-stone-400 text-xs uppercase tracking-widest mt-1">{revData.matches.length > 1 ? (i===0 ? "Primary Match" : "Secondary Match") : "Original Date of Passing"}</p>
                             <h3 className="text-2xl sm:text-3xl font-serif font-bold text-amber-400 mt-1">{m.date_formatted}</h3>
                             <p className="text-amber-700 text-xs mt-2">({revData.tithi_formatted} in {revData.month_name} {revData.year})</p>
                          </div>
                        ))}

                        <div className="pt-4 flex justify-center">
                           <button onClick={() => triggerTransfer(revData.matches[0].raw_date)} className="text-sm text-stone-900 bg-amber-500 hover:bg-amber-400 font-bold px-6 py-3 rounded-full transition-transform hover:scale-105 shadow-lg shadow-amber-900/20">
                             Calculate Upcoming Shraad ➡️
                           </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Footer & Share */}
        <div className="mt-12 text-center pb-12">
          <h4 className="font-serif text-2xl text-amber-500 mb-6">Share this App</h4>
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <a href={`https://wa.me/?text=${encodeURIComponent("Check out the Kashmiri Shraad Calculator! Save this link to easily find traditional Shraad dates: " + APP_URL)}`} target="_blank" className="flex items-center gap-2 bg-stone-800/80 border border-stone-700 px-5 py-2.5 rounded-full text-sm text-stone-200 hover:bg-stone-700 transition-colors">
              <span className="text-green-500 text-lg">✆</span> WhatsApp
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_URL)}`} target="_blank" className="flex items-center gap-2 bg-stone-800/80 border border-stone-700 px-5 py-2.5 rounded-full text-sm text-stone-200 hover:bg-stone-700 transition-colors">
              <span className="text-blue-500 text-lg">f</span> Facebook
            </a>
          </div>
          
          <div className="bg-stone-900/50 border border-stone-800 inline-block px-4 py-2 rounded-lg mb-8">
            <code className="text-stone-400 text-sm">{APP_URL}</code>
          </div>

          <div className="space-y-1">
            <p className="text-stone-500 text-xs uppercase tracking-widest">With traditional insights from Saroj Kaw</p>
            <p className="text-stone-500 text-xs uppercase tracking-widest">Built for our community by Shashank Kaw</p>
          </div>
        </div>

      </div>
    </div>
  );
}