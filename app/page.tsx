'use client';
import { useState, useRef, useEffect, useMemo } from 'react';

const KASHMIRI_TITHIS = [
  "Okdoh", "Doy", "Trey", "Choram", "Pancham", "Shish", "Saptam", "Aetham", "Navam", "Daham", "Kah", "Bah", "Truvah", "Tshodah"
];

const MONTH_NAMES = [
  "Chaitra", "Vaisakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",
  "Ashvina", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"
];

const ENG_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ShraadApp() {
  const [activeTab, setActiveTab] = useState(0); 
  const [showWelcome, setShowWelcome] = useState(true);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('general');

  // Standard Calc
  const [personName, setPersonName] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [targetYear, setTargetYear] = useState(new Date().getFullYear().toString());
  const [knowsTime, setKnowsTime] = useState(false);
  const [deathHour, setDeathHour] = useState("01");
  const [deathMin, setDeathMin] = useState("00");
  const [deathAmPm, setDeathAmPm] = useState("AM");
  
  // Mobile Date Picker State
  const [mobileDay, setMobileDay] = useState("");
  const [mobileMonth, setMobileMonth] = useState("");
  const [mobileYear, setMobileYear] = useState("");

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

  // API Config
  const API_URL = "https://shashankkaw-shraad-api.hf.space";
  const APP_URL = "https://kashmiri-shraad.vercel.app";

  const tithiOpts = [...KASHMIRI_TITHIS, revPaksha.includes("Zoon") ? "Purnima" : "Mawas (Amavasya)"];

  // --- BULLETPROOF EVENT HANDLERS (No infinite loops) ---
  
  // 1. When Desktop Calendar changes
  const handleDesktopDateChange = (val: string) => {
    setDeathDate(val);
    if (val) {
      const [y, m, d] = val.split('-');
      if (y && m && d) {
        setMobileYear(y);
        setMobileMonth(parseInt(m, 10).toString());
        setMobileDay(parseInt(d, 10).toString());
      }
    } else {
      setMobileYear(""); setMobileMonth(""); setMobileDay("");
    }
  };

  // 2. When Mobile Dropdowns change
  const handleMobileDateChange = (field: string, val: string) => {
    let newD = mobileDay;
    let newM = mobileMonth;
    let newY = mobileYear;

    if (field === 'day') { newD = val; setMobileDay(val); }
    if (field === 'month') { newM = val; setMobileMonth(val); }
    if (field === 'year') { newY = val; setMobileYear(val); }

    // If all three fields are selected, stitch them together and update main date
    if (newD && newM && newY) {
      const dStr = String(newD).padStart(2, '0');
      const mStr = String(newM).padStart(2, '0');
      setDeathDate(`${newY}-${mStr}-${dStr}`);
    }
  };


  // --- Dynamic Target Year Logic ---
  const availableYears = useMemo(() => {
    const today = new Date();
    const currY = today.getFullYear();
    const currM = today.getMonth();
    const currD = today.getDate();

    let max = currY;
    let min = currY - 100;

    if (deathDate) {
      const dObj = new Date(deathDate);
      if (!isNaN(dObj.getTime())) {
        const passY = dObj.getFullYear();
        const passM = dObj.getMonth();
        const passD = dObj.getDate();

        min = passY;
        if (passM > currM || (passM === currM && passD > currD)) {
          max = currY;
        } else {
          max = currY + 1;
        }
      }
    }

    const yArr = [];
    for (let i = max; i >= min; i--) {
      yArr.push(i);
    }
    return yArr.length > 0 ? yArr : [currY];
  }, [deathDate]);

  useEffect(() => {
    setTargetYear(prev => {
      if (!availableYears.includes(parseInt(prev))) {
        return availableYears[0].toString();
      }
      return prev;
    });
  }, [availableYears]);

  // --- Submissions & Logic ---
  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deathDate) {
      alert("Please select a complete Date of Passing.");
      return;
    }
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
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
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
      setTimeout(() => revResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    } catch (err) {
      alert("Error connecting to backend API.");
    }
    setLoadingRev(false);
  };

  const triggerTransfer = (rawDt: string) => {
    handleDesktopDateChange(rawDt); // Safely sets main date & mobile fields
    setPersonName(revName);
    setActiveTab(0);
    setCalcData(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const formatUpcomingDate = (dateStr: string, passedDateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { text: dateStr, isExactMatch: false };

    const monthOpts: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    const mmyyyy = d.toLocaleDateString('en-US', monthOpts);

    if (passedDateStr) {
      const origD = new Date(passedDateStr);
      if (!isNaN(origD.getTime())) {
        if (origD.getDate() === d.getDate() && origD.getMonth() === d.getMonth()) {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          return { text: `${dd}/${mm}/${yyyy}`, isExactMatch: true };
        }
      }
    }
    return { text: mmyyyy, isExactMatch: false };
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

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 font-sans selection:bg-[#111827] selection:text-white">
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes subtleFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        .anim-fade-up { animation: subtleFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-slide-right { animation: slideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .delay-100 { animation-delay: 0.1s; opacity: 0; }
        .delay-200 { animation-delay: 0.2s; opacity: 0; }
        html { scroll-behavior: smooth; }
      `}} />

      {/* Subtle Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#111827]/5 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-slate-400/10 blur-[100px]"></div>
      </div>

      {/* --- Welcome Modal --- */}
      {showWelcome && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#111827]/60 backdrop-blur-md px-4">
          <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden anim-fade-up border border-slate-100">
            <div className="bg-[#111827] p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-700/30 to-transparent"></div>
              <div className="relative z-10">
                <span className="text-[10px] sm:text-xs uppercase tracking-[0.3em] font-semibold text-slate-300 block mb-2">Vijayshwar Jantri Aligned</span>
                <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white">Shraad Calculator</h2>
              </div>
            </div>
            
            <div className="p-8 sm:p-10 space-y-8">
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed text-center">
                Discover authentic traditional Kashmiri Shraad dates for your departed loved ones with mathematical precision.
              </p>
              
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 text-center border-b border-slate-100 pb-2">Capabilities</h3>
                <ul className="space-y-4 text-sm text-slate-700">
                  <li className="flex items-start"><span className="text-[#111827] text-lg mr-3 leading-none">🕊️</span><span><strong>Search Shraad Date:</strong> Find the exact Shraad date for any upcoming year based on the English date of passing.</span></li>
                  <li className="flex items-start"><span className="text-[#111827] text-lg mr-3 leading-none">🕰️</span><span><strong>Reverse Date Lookup:</strong> Use traditional Tithis to find the historical English date of passing.</span></li>
                  <li className="flex items-start"><span className="text-[#111827] text-lg mr-3 leading-none">📅</span><span><strong>Calendar Integration:</strong> Add calculated dates directly to your calendars.</span></li>
                </ul>
              </div>

              <button onClick={() => setShowWelcome(false)} className="w-full bg-[#111827] hover:bg-[#1e293b] text-white font-semibold py-4 rounded-2xl transition-all shadow-lg shadow-[#111827]/20">Enter Calculator</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Feedback Modal --- */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/60 backdrop-blur-md px-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden anim-fade-up">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="font-serif font-bold text-xl text-slate-800 tracking-wide">Support & Feedback</h3>
              <button onClick={() => setIsFeedbackOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors text-xl">✕</button>
            </div>
            <form onSubmit={handleFeedbackSubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">What would you like to share?</label>
                <div className="flex flex-col space-y-3">
                  <label className="flex items-center space-x-3 text-sm cursor-pointer group"><input type="radio" name="fb_type_group" value="general" checked={feedbackType === 'general'} onChange={() => setFeedbackType('general')} className="w-4 h-4 accent-[#111827]" /><span className="group-hover:text-[#111827] transition-colors font-medium">General Feedback / Suggestion</span></label>
                  <label className="flex items-center space-x-3 text-sm cursor-pointer group"><input type="radio" name="fb_type_group" value="bug" checked={feedbackType === 'bug'} onChange={() => setFeedbackType('bug')} className="w-4 h-4 accent-[#111827]" /><span className="group-hover:text-[#111827] transition-colors font-medium">Report an Incorrect Date</span></label>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Your Email Address</label>
                <input type="email" name="fb_email" placeholder="name@example.com" className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-[#111827]/20 focus:border-[#111827] transition-all outline-none" required />
              </div>

              {feedbackType === 'bug' ? (
                <div className="space-y-4 anim-fade-up">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Actual Date</label><input type="text" name="fb_dob" placeholder="e.g., 22 Jan 1960" className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-[#111827]/20 focus:border-[#111827] transition-all outline-none" /></div>
                    <div><label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Expected (Jantri)</label><input type="text" name="fb_expected" placeholder="e.g., 10 Feb" className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-[#111827]/20 focus:border-[#111827] transition-all outline-none" /></div>
                  </div>
                  <div><label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">App Result</label><input type="text" name="fb_actual" placeholder="e.g., 30 Jan" className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-[#111827]/20 focus:border-[#111827] transition-all outline-none" /></div>
                  <div><label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Additional Notes</label><textarea name="fb_notes" rows={2} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-[#111827]/20 focus:border-[#111827] transition-all outline-none resize-none" placeholder="Time of passing, Year being checked, etc."></textarea></div>
                </div>
              ) : (
                <div className="anim-fade-up"><label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Your Feedback</label><textarea name="fb_text" rows={4} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-[#111827]/20 focus:border-[#111827] transition-all outline-none resize-none" placeholder="Type your suggestion here..." required></textarea></div>
              )}
              <button type="submit" className="w-full bg-[#111827] hover:bg-[#1e293b] text-white font-semibold py-4 rounded-2xl transition-all shadow-md">Send Message</button>
            </form>
          </div>
        </div>
      )}

      {/* --- Main App Container --- */}
      <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-12 lg:gap-20 pt-8 lg:pt-16">
        
        {/* LEFT COLUMN: Hero Section */}
        <div className="lg:w-5/12 flex flex-col justify-between lg:sticky lg:top-16 h-auto lg:h-[calc(100vh-8rem)] anim-fade-up px-4 lg:px-0">
          <div>
            <span className="inline-block py-1 px-3 rounded-full bg-slate-200/50 text-[#111827] text-[10px] sm:text-xs uppercase tracking-[0.2em] font-bold mb-6 border border-slate-300/50 shadow-sm">Sacred Astronomical Alignment</span>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold text-[#111827] leading-[1.1] mb-6">Shraad <br /> Calculator</h1>
            <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-md">Calculate authentic traditional Kashmiri Hindu Shraad dates for your departed loved ones, meticulously aligned with the Vijayshwar Jantri.</p>
          </div>

          <div className="hidden lg:block space-y-8 mt-12 pb-8">
            <div className="space-y-4">
              <h3 className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Share with Family</h3>
              <div className="flex gap-3">
                <a href={`https://wa.me/?text=${encodeURIComponent('Discover the traditional Kashmiri Shraad dates with precision: ' + APP_URL)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center w-12 h-12 bg-white rounded-full border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-[#111827]"><svg viewBox="0 0 448 512" className="w-5 h-5 fill-current"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3 18.7-68.1-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.6-30.6-37.9-3.2-5.5-.3-8.5 2.5-11.2 2.5-2.5 5.5-6.6 8.3-9.9 2.8-3.3 3.7-5.6 5.6-9.2 1.9-3.7.9-6.6-.5-9.2-1.4-2.8-12.5-30.1-17.1-41.1-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.7 23.5 9.2 31.6 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg></a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_URL)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center w-12 h-12 bg-white rounded-full border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-[#111827]"><svg viewBox="0 0 512 512" className="w-5 h-5 fill-current"><path d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.78 90.69 226.38 209.25 245.26V312.6h-66.38V256h66.38V212.87c0-65.51 38.89-101.62 98.45-101.62 28.53 0 58.31 5.1 58.31 5.1v64h-32.81c-32.36 0-42.48 20.06-42.48 40.63V256h72.06l-11.51 56.6h-60.55v188.66C413.31 482.38 504 379.78 504 256z"/></svg></a>
                <button onClick={() => { navigator.clipboard.writeText(APP_URL); alert("Link Copied!"); }} className="flex items-center justify-center w-12 h-12 bg-white rounded-full border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-[#111827]"><svg viewBox="0 0 448 512" className="w-5 h-5 fill-current"><path d="M208 0L332.1 0c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9L448 336c0 26.5-21.5 48-48 48l-192 0c-26.5 0-48-21.5-48-48l0-288c0-26.5 21.5-48 48-48zM48 128l80 0 0 64-64 0 0 256 192 0 0-32 64 0 0 48c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 176c0-26.5 21.5-48 48-48z"/></svg></button>
              </div>
            </div>
            <div className="space-y-2 pt-6 border-t border-slate-200/60">
              <p className="text-slate-500 text-[10px] tracking-[0.1em] uppercase font-bold">With traditional insights from Saroj Kaw</p>
              <p className="text-slate-500 text-[10px] tracking-[0.1em] uppercase font-bold">Built for our community by Shashank Kaw</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: The Interactive Calculator Card */}
        <div className="lg:w-7/12 w-full anim-slide-right pb-12 px-2 lg:px-0">
          <div className="bg-white rounded-[2rem] lg:rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(17,24,39,0.1)] border border-slate-100 overflow-hidden">
            
            <div className="p-4 sm:p-6 bg-slate-50/50 border-b border-slate-100">
              <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
                <button onClick={() => { setActiveTab(0); setRevData(null); }} className={`flex-1 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] rounded-xl transition-all duration-300 ${activeTab === 0 ? 'bg-white shadow-sm text-[#111827]' : 'text-slate-500 hover:text-slate-700'}`}>Search Shraad</button>
                <button onClick={() => { setActiveTab(1); setCalcData(null); }} className={`flex-1 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] rounded-xl transition-all duration-300 ${activeTab === 1 ? 'bg-white shadow-sm text-[#111827]' : 'text-slate-500 hover:text-slate-700'}`}>Reverse Lookup</button>
              </div>
            </div>

            {/* TAB 1: STANDARD SEARCH */}
            {activeTab === 0 && (
              <div className="p-6 sm:p-10 space-y-8 anim-fade-up">
                <form onSubmit={handleStandardSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-2 ml-1">Name of Departed Soul (Optional)</label>
                      <input type="text" value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="e.g. Ram" className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]/40 transition-all outline-none text-slate-800 placeholder-slate-400" />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-2 ml-1">Date of Passing</label>
                      
                      {/* DESKTOP NATIVE PICKER */}
                      <input 
                        type="date" 
                        value={deathDate} 
                        onChange={(e) => handleDesktopDateChange(e.target.value)} 
                        className="hidden md:block w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]/40 transition-all outline-none text-slate-800" 
                      />
                      
                      {/* MOBILE 3-DROPDOWN PICKER */}
                      <div className="md:hidden grid grid-cols-3 gap-2">
                         <div className="relative">
                            <select value={mobileDay} onChange={(e) => handleMobileDateChange('day', e.target.value)} className="w-full bg-slate-50 border border-slate-200 py-3.5 pl-3 pr-8 rounded-2xl text-sm focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]/40 transition-all outline-none text-slate-800 appearance-none">
                               <option value="" disabled>Day</option>
                               {Array.from({length: 31}, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                               <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                         </div>
                         <div className="relative">
                            <select value={mobileMonth} onChange={(e) => handleMobileDateChange('month', e.target.value)} className="w-full bg-slate-50 border border-slate-200 py-3.5 pl-3 pr-8 rounded-2xl text-sm focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]/40 transition-all outline-none text-slate-800 appearance-none">
                               <option value="" disabled>Mth</option>
                               {ENG_MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                               <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                         </div>
                         <div className="relative">
                            <select value={mobileYear} onChange={(e) => handleMobileDateChange('year', e.target.value)} className="w-full bg-slate-50 border border-slate-200 py-3.5 pl-3 pr-8 rounded-2xl text-sm focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]/40 transition-all outline-none text-slate-800 appearance-none">
                               <option value="" disabled>Year</option>
                               {Array.from({length: currentYear - 1920 + 1}, (_, i) => currentYear - i).map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                               <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                         </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-2 ml-1">Find Shraad For Year</label>
                      <div className="relative">
                        <select value={targetYear} onChange={(e) => setTargetYear(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]/40 transition-all outline-none text-slate-800 appearance-none">
                          {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50/80 p-6 rounded-3xl border border-slate-100">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <input type="checkbox" checked={knowsTime} onChange={(e) => setKnowsTime(e.target.checked)} className="w-5 h-5 accent-[#111827] rounded cursor-pointer" />
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-[#111827] transition-colors">I know the exact time of passing</span>
                    </label>
                    {knowsTime && (
                      <div className="grid grid-cols-3 gap-4 mt-5 anim-fade-up">
                        <div className="relative"><select value={deathHour} onChange={(e) => setDeathHour(e.target.value)} className="w-full bg-white border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]/40 outline-none appearance-none text-slate-800">{Array.from({length: 12}, (_, i) => <option key={i+1} value={String(i+1).padStart(2, '0')}>{String(i+1).padStart(2, '0')}</option>)}</select></div>
                        <div className="relative"><select value={deathMin} onChange={(e) => setDeathMin(e.target.value)} className="w-full bg-white border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]/40 outline-none appearance-none text-slate-800">{Array.from({length: 60}, (_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>)}</select></div>
                        <div className="relative"><select value={deathAmPm} onChange={(e) => setDeathAmPm(e.target.value)} className="w-full bg-white border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]/40 outline-none appearance-none text-slate-800"><option>AM</option><option>PM</option></select></div>
                      </div>
                    )}
                    {!knowsTime && <p className="text-xs text-slate-500 mt-3 ml-8 italic tracking-wide">If unknown, the calculation evaluates standard Sunrise boundary options automatically.</p>}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <button type="submit" disabled={loadingCalc} className="w-full sm:w-3/4 bg-gradient-to-r from-[#111827] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155] text-white font-semibold py-4 rounded-2xl transition-all shadow-lg shadow-[#111827]/20">
                      {loadingCalc ? "Aligning Vectors..." : "Calculate Shraad Date"}
                    </button>
                    <button type="button" onClick={() => setIsFeedbackOpen(true)} className="w-full sm:w-1/4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-semibold py-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2">Feedback</button>
                  </div>
                </form>

                {/* Standard Results */}
                <div ref={resultsRef} className="scroll-mt-6">
                  {calcData?.success && (
                    <div className="space-y-6 border-t border-slate-100 pt-8 anim-fade-up delay-100">
                      {calcData.results.map((res: any, idx: number) => (
                        <div key={idx} className="bg-[#F8F9FA] border border-slate-200 p-6 sm:p-8 rounded-3xl relative overflow-hidden">
                          {res.scenario_type === 'predawn' && <div className="bg-[#111827] text-white p-3 rounded-xl mb-6 text-sm font-medium inline-block shadow-sm"><span className="mr-2 opacity-80">🌙</span> If passing occurred BEFORE dawn (~6:30 AM)</div>}
                          {res.scenario_type === 'postdawn' && <div className="bg-white border border-slate-200 text-slate-800 p-3 rounded-xl mb-6 text-sm font-medium inline-block shadow-sm"><span className="mr-2 opacity-80">☀️</span> If passing occurred AFTER dawn (~6:30 AM)</div>}
                          {res.scenario_type === 'exact' && <div className="bg-[#111827] text-white p-3 rounded-xl mb-6 text-sm font-medium inline-block shadow-sm">{res.is_predawn ? "🌙 Time is before dawn. Anchored to previous Hindu day." : "☀️ Anchored to today's Hindu day."}</div>}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm"><span className="text-[10px] text-slate-400 block uppercase tracking-[0.2em] font-bold mb-1">Lunar Masa</span><span className="text-slate-800 font-serif text-lg font-bold">{res.lunar_masa}</span></div>
                            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm"><span className="text-[10px] text-slate-400 block uppercase tracking-[0.2em] font-bold mb-1">Official Tithi</span><span className="text-slate-800 font-serif text-lg font-bold">{res.official_tithi}</span></div>
                          </div>

                          {res.shraad_date_str ? (
                            <>
                              <div className="bg-[#111827] rounded-[2rem] p-8 sm:p-10 shadow-xl relative overflow-hidden text-center mb-6">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-400/50 to-transparent"></div>
                                <div className="text-slate-400/80 text-3xl mb-3">🕊️</div>
                                <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] font-bold text-slate-400 mb-2">Calculated Shraad Date</p>
                                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white leading-tight py-2">{res.shraad_date_str}</h3>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <a href={generateGCalUrl(res.shraad_raw_date, personName)} target="_blank" rel="noreferrer" className="group flex items-center justify-center bg-white border border-slate-200 hover:border-[#111827]/30 text-slate-700 text-sm font-bold py-4 rounded-2xl transition-all shadow-sm"><span className="mr-2 group-hover:scale-110 transition-transform duration-300">📅</span> Google Calendar</a>
                                <button onClick={() => downloadICS(res.shraad_raw_date, personName)} className="group flex items-center justify-center bg-white border border-slate-200 hover:border-[#111827]/30 text-slate-700 text-sm font-bold py-4 rounded-2xl transition-all shadow-sm"><span className="mr-2 group-hover:scale-110 transition-transform duration-300">📥</span> Apple / Outlook</button>
                              </div>

                              <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-3xl shadow-sm">
                                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] mb-4 pb-4 border-b border-slate-100">📅 Upcoming Dates (Next 5 Years)</h3>
                                <ul className="space-y-4">
                                  {res.future_dates.map((fd: any, fIdx: number) => {
                                    const formatted = formatUpcomingDate(fd.raw_date, deathDate);
                                    return (
                                      <li key={fIdx} className={`flex justify-between items-center ${fIdx !== res.future_dates.length - 1 ? 'border-b border-slate-50 pb-4' : ''}`}>
                                        <span className="font-serif font-bold text-slate-400 text-lg">{fd.year}</span>
                                        <span className={`${formatted.isExactMatch ? 'text-[#111827] font-bold bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2' : 'text-slate-700 font-semibold'}`}>
                                          {formatted.isExactMatch && <span className="text-sm">🕊️</span>}
                                          {formatted.text}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </>
                          ) : (
                            <div className="bg-rose-50 border border-rose-100 text-rose-800 p-5 rounded-2xl text-sm flex items-center gap-3"><span className="text-xl">🚨</span> Could not accurately resolve a structural date match.</div>
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
              <div className="p-6 sm:p-10 space-y-8 anim-fade-up">
                <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 text-center mx-auto mb-2">
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">If you only know the traditional Kashmiri Tithi and the year of passing, use this tool to find the exact historical calendar date.</p>
                </div>

                <form onSubmit={handleReverseSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-2 ml-1">Name of Departed Soul (Optional)</label>
                      <input type="text" value={revName} onChange={(e) => setRevName(e.target.value)} placeholder="e.g. Sita" className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]/40 transition-all outline-none text-slate-800 placeholder-slate-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-2 ml-1">Year of Passing</label>
                      <input type="number" value={revYear} onChange={(e) => setRevYear(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]/40 transition-all outline-none text-slate-800" min="1930" max="2100" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-2 ml-1">Lunar Month (Masa)</label>
                      <div className="relative">
                        <select value={revMonth} onChange={(e) => setRevMonth(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]/40 transition-all outline-none text-slate-800 appearance-none">{MONTH_NAMES.map(m => <option key={m} value={m}>{m}</option>)}</select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-2 ml-1">Lunar Phase (Paksha)</label>
                      <div className="relative">
                        <select value={revPaksha} onChange={(e) => setRevPaksha(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]/40 transition-all outline-none text-slate-800 appearance-none"><option>Zoon Pachh (Shukla)</option><option>Gat Pachh (Krishna)</option></select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-2 ml-1">Tithi</label>
                      <div className="relative">
                        <select value={revTithi} onChange={(e) => setRevTithi(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]/40 transition-all outline-none text-slate-800 appearance-none">{tithiOpts.map(t => <option key={t} value={t}>{t}</option>)}</select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <button type="submit" disabled={loadingRev} className="w-full sm:w-3/4 bg-gradient-to-r from-[#111827] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155] text-white font-semibold py-4 rounded-2xl transition-all shadow-lg shadow-[#111827]/20">
                      {loadingRev ? "Scanning Records..." : "Find Exact Date"}
                    </button>
                    <button type="button" onClick={() => setIsFeedbackOpen(true)} className="w-full sm:w-1/4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-semibold py-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2">Feedback</button>
                  </div>
                </form>

                {/* Reverse Results */}
                <div ref={revResultsRef} className="scroll-mt-6">
                  {revData?.success && (
                    <div className="border-t border-slate-100 pt-8 anim-fade-up delay-100">
                      {revData.matches.length === 0 ? (
                         <div className="bg-rose-50 border border-rose-100 text-rose-800 p-5 rounded-2xl text-sm flex items-center gap-3"><span className="text-xl">🚨</span> Could not find any day in {revData.year} where this Tithi was active at sunrise. It may have been a Kshaya (skipped) Tithi.</div>
                      ) : (
                        <div className="space-y-6">
                          {revData.matches.length > 1 && <div className="bg-[#111827] text-white p-4 rounded-2xl text-sm font-medium text-center shadow-md">This was a <b>Devadev</b> (Double Tithi). Active on two consecutive days:</div>}
                          
                          {revData.matches.map((m: any, i: number) => (
                            <div key={i} className="bg-[#111827] rounded-[2rem] p-8 sm:p-10 shadow-xl relative overflow-hidden text-center">
                               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-400/50 to-transparent"></div>
                               <div className="text-slate-400/80 text-3xl mb-3">🕊️</div>
                               <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] font-bold text-slate-400 mb-2">{revData.matches.length > 1 ? (i===0 ? "Primary Match" : "Secondary Match") : "Original Date of Passing"}</p>
                               <h3 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white leading-tight py-2">{m.date_formatted}</h3>
                               <div className="w-16 h-[1px] bg-slate-700 mx-auto my-5"></div>
                               <p className="text-slate-300 text-xs uppercase tracking-[0.15em] font-semibold">{revData.tithi_formatted} in <span className="text-white">{revData.month_name} {revData.year}</span></p>
                            </div>
                          ))}
                          <div className="pt-4 flex justify-center">
                             <button onClick={() => triggerTransfer(revData.matches[0].raw_date)} className="group flex items-center gap-3 bg-white border border-slate-200 hover:border-[#111827]/40 text-[#111827] font-bold px-8 py-4 rounded-full transition-all shadow-md hover:shadow-lg">
                               Calculate Upcoming Shraad <span className="group-hover:translate-x-1 transition-transform">➡️</span>
                             </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile-only Footer */}
        <div className="lg:hidden space-y-8 pb-12 anim-fade-up delay-200 px-4">
          <div className="flex gap-4 justify-center">
            <a href={`https://wa.me/?text=${encodeURIComponent('Discover the traditional Kashmiri Shraad dates with precision: ' + APP_URL)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center w-12 h-12 bg-white rounded-full border border-slate-200 hover:border-slate-300 shadow-sm text-[#111827]"><svg viewBox="0 0 448 512" className="w-5 h-5 fill-current"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3 18.7-68.1-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.6-30.6-37.9-3.2-5.5-.3-8.5 2.5-11.2 2.5-2.5 5.5-6.6 8.3-9.9 2.8-3.3 3.7-5.6 5.6-9.2 1.9-3.7.9-6.6-.5-9.2-1.4-2.8-12.5-30.1-17.1-41.1-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.7 23.5 9.2 31.6 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg></a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_URL)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center w-12 h-12 bg-white rounded-full border border-slate-200 hover:border-slate-300 shadow-sm text-[#111827]"><svg viewBox="0 0 512 512" className="w-5 h-5 fill-current"><path d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.78 90.69 226.38 209.25 245.26V312.6h-66.38V256h66.38V212.87c0-65.51 38.89-101.62 98.45-101.62 28.53 0 58.31 5.1 58.31 5.1v64h-32.81c-32.36 0-42.48 20.06-42.48 40.63V256h72.06l-11.51 56.6h-60.55v188.66C413.31 482.38 504 379.78 504 256z"/></svg></a>
            <button onClick={() => { navigator.clipboard.writeText(APP_URL); alert("Link Copied!"); }} className="flex items-center justify-center w-12 h-12 bg-white rounded-full border border-slate-200 hover:border-slate-300 shadow-sm text-[#111827]"><svg viewBox="0 0 448 512" className="w-5 h-5 fill-current"><path d="M208 0L332.1 0c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9L448 336c0 26.5-21.5 48-48 48l-192 0c-26.5 0-48-21.5-48-48l0-288c0-26.5 21.5-48 48-48zM48 128l80 0 0 64-64 0 0 256 192 0 0-32 64 0 0 48c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 176c0-26.5 21.5-48 48-48z"/></svg></button>
          </div>
          <div className="space-y-2 text-center">
            <p className="text-slate-400 text-[10px] tracking-[0.1em] uppercase font-bold">With traditional insights from Saroj Kaw</p>
            <p className="text-slate-400 text-[10px] tracking-[0.1em] uppercase font-bold">Built for our community by Shashank Kaw</p>
          </div>
        </div>

      </div>
    </div>
  );
}