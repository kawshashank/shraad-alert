from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import swisseph as swe
import math
from datetime import datetime, timedelta, time, date
import pytz

app = FastAPI(title="Shraad Calculator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COMMON_ZONES = {
    "Delhi, India (IST)": "Asia/Kolkata",
    "New York, USA (EST/EDT)": "America/New_York",
    "London, UK (GMT/BST)": "Europe/London",
    "Dubai, UAE (GST)": "Asia/Dubai",
    "Singapore (SGT)": "Asia/Singapore",
    "Toronto, CAN (EST/EDT)": "America/Toronto",
    "San Francisco, USA (PST/PDT)": "America/Los_Angeles",
    "Sydney, AUS (AEST/AEDT)": "Australia/Sydney"
}

KASHMIRI_TITHIS = [
    "Okdoh", "Doy", "Trey", "Choram", "Pancham", 
    "Shish", "Saptam", "Aetham", "Navam", "Daham", 
    "Kah", "Bah", "Truvah", "Tshodah", "Purnima",
    "Okdoh", "Doy", "Trey", "Choram", "Pancham", 
    "Shish", "Saptam", "Aetham", "Navam", "Daham", 
    "Kah", "Bah", "Truvah", "Tshodah", "Mawas"
]

MONTH_NAMES = [
    "Chaitra", "Vaisakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",
    "Ashvina", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"
]

def get_julian_day(dt: datetime, tz_str="Asia/Kolkata") -> float:
    tz = pytz.timezone(tz_str)
    if dt.tzinfo is None: dt = tz.localize(dt)
    utc_dt = dt.astimezone(pytz.utc)
    decimal_hour = utc_dt.hour + (utc_dt.minute / 60.0) + (utc_dt.second / 3600.0)
    return swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, decimal_hour)

def get_sun_moon_longitude(jd: float):
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    flags = swe.FLG_SWIEPH | swe.FLG_SIDEREAL
    sun_info, _ = swe.calc_ut(jd, swe.SUN, flags)
    moon_info, _ = swe.calc_ut(jd, swe.MOON, flags)
    return sun_info[0], moon_info[0]

def get_previous_new_moon(jd: float) -> float:
    s, m = get_sun_moon_longitude(jd)
    diff = (m - s) % 360
    test_jd = jd - (diff / 12.190749)
    for _ in range(7):
        s, m = get_sun_moon_longitude(test_jd)
        cdiff = (m - s) % 360
        if cdiff > 180: cdiff -= 360
        test_jd -= (cdiff / 12.190749)
        if abs(cdiff) < 0.00001: break
    return test_jd

def is_malmaas(jd: float) -> bool:
    nm1 = get_previous_new_moon(jd)
    nm2 = get_previous_new_moon(nm1 + 35)
    s1, _ = get_sun_moon_longitude(nm1)
    s2, _ = get_sun_moon_longitude(nm2)
    r1 = math.floor(s1 / 30.0)
    r2 = math.floor(s2 / 30.0)
    return r1 == r2

def calculate_tithi_from_jd(jd: float) -> int:
    sun_long, moon_long = get_sun_moon_longitude(jd)
    angle_diff = (moon_long - sun_long) % 360
    tithi_index = math.floor(angle_diff / 12.0) + 1
    return min(max(tithi_index, 1), 30)

def get_lunar_month_index(jd: float, tithi_idx: int) -> int:
    sun_long, moon_long = get_sun_moon_longitude(jd)
    diff = (moon_long - sun_long) % 360
    test_jd = jd - (diff / 12.190749)
    for _ in range(5):
        s, m = get_sun_moon_longitude(test_jd)
        current_diff = (m - s) % 360
        if current_diff > 180: current_diff -= 360 
        test_jd -= (current_diff / 12.190749)
        if abs(current_diff) < 0.001: break
            
    sun_long_at_new_moon, _ = get_sun_moon_longitude(test_jd)
    adjusted_sun_long = sun_long_at_new_moon - 1.5
    if adjusted_sun_long < 0: adjusted_sun_long += 360
    
    rashi_index = math.floor(adjusted_sun_long / 30.0)
    month_index = (rashi_index + 1) % 12
    if tithi_idx > 15: month_index = (month_index + 1) % 12
    return month_index

def format_tithi_name(tithi_idx: int) -> str:
    if tithi_idx == 15: return "Purnima"
    elif tithi_idx == 30: return "Mawas (Amavasya)"
    paksha = "Zoon Pachh" if tithi_idx < 15 else "Gat Pachh"
    name = KASHMIRI_TITHIS[tithi_idx - 1]
    return f"{paksha} {name}"

def resolve_death_tithi(death_date, death_time, tz_str="Asia/Kolkata"):
    if death_time < time(6, 30):
        effective_date = death_date - timedelta(days=1)
        is_predawn = True
    else:
        effective_date = death_date
        is_predawn = False
        
    jd_sunrise = get_julian_day(datetime.combine(effective_date, time(7, 0)), tz_str)
    tithi_idx = calculate_tithi_from_jd(jd_sunrise)
    jd_yesterday = get_julian_day(datetime.combine(effective_date - timedelta(days=1), time(7, 0)), tz_str)
    tithi_yesterday = calculate_tithi_from_jd(jd_yesterday)
    
    if tithi_idx == tithi_yesterday:
        tithi_idx += 1
        if tithi_idx > 30: tithi_idx = 1
            
    return tithi_idx, effective_date, is_predawn

def calculate_target_shraad_date(target_year: int, target_month_idx: int, target_tithi_idx: int, original_was_malmaas: bool, tz_str: str) -> date:
    start_date = datetime(target_year, 1, 1)
    udaya_days = []
    aparahna_days = []
    
    for day_offset in range(400):
        scan_date = start_date + timedelta(days=day_offset)
        jd_udaya = get_julian_day(datetime.combine(scan_date, time(7, 0)), tz_str)
        t_udaya = calculate_tithi_from_jd(jd_udaya)
        m_udaya = get_lunar_month_index(jd_udaya, t_udaya)
        
        if m_udaya == target_month_idx and t_udaya == target_tithi_idx:
            if not original_was_malmaas and is_malmaas(jd_udaya):
                pass 
            else:
                udaya_days.append(scan_date.date())
            
        jd_ap_start = get_julian_day(datetime.combine(scan_date, time(13, 30)), tz_str)
        t_ap_start = calculate_tithi_from_jd(jd_ap_start)
        m_ap_start = get_lunar_month_index(jd_ap_start, t_ap_start)
        jd_ap_end = get_julian_day(datetime.combine(scan_date, time(15, 45)), tz_str)
        t_ap_end = calculate_tithi_from_jd(jd_ap_end)
        m_ap_end = get_lunar_month_index(jd_ap_end, t_ap_end)
        
        match_ap_start = (m_ap_start == target_month_idx and t_ap_start == target_tithi_idx)
        if match_ap_start and not original_was_malmaas and is_malmaas(jd_ap_start):
            match_ap_start = False
            
        match_ap_end = (m_ap_end == target_month_idx and t_ap_end == target_tithi_idx)
        if match_ap_end and not original_was_malmaas and is_malmaas(jd_ap_end):
            match_ap_end = False
        
        if match_ap_start or match_ap_end:
            aparahna_days.append(scan_date.date())

    if len(udaya_days) > 0: return udaya_days[0]
    if len(aparahna_days) > 0: return aparahna_days[0]
    return None

def find_original_dates(target_year: int, target_month_idx: int, target_tithi_idx: int, tz_str: str):
    start_date = datetime(target_year, 1, 1)
    matching_dates = []
    for day_offset in range(400):
        scan_date = start_date + timedelta(days=day_offset)
        jd_udaya = get_julian_day(datetime.combine(scan_date, time(7, 0)), tz_str)
        t_udaya = calculate_tithi_from_jd(jd_udaya)
        m_udaya = get_lunar_month_index(jd_udaya, t_udaya)
        if m_udaya == target_month_idx and t_udaya == target_tithi_idx:
            if scan_date.year == target_year: matching_dates.append(scan_date.date())
    return matching_dates

class ShraadRequest(BaseModel):
    soul_name: Optional[str] = ""
    death_date: str
    knows_time: bool
    death_time: Optional[str] = None
    target_year: int
    timezone: Optional[str] = "Delhi, India (IST)"

class ReverseLookupRequest(BaseModel):
    soul_name: Optional[str] = ""
    rev_year: int
    rev_month_name: str
    rev_paksha: str
    rev_tithi_name: str
    timezone: Optional[str] = "Delhi, India (IST)"

class PitraPakshRequest(BaseModel):
    target_year: int
    timezone: Optional[str] = "Delhi, India (IST)"

@app.get("/")
def health_check():
    return {"status": "online", "engine": "Shraad Calculator"}

@app.post("/api/calculate_shraad")
def api_calculate_shraad(req: ShraadRequest):
    try:
        tz_name = COMMON_ZONES.get(req.timezone, "Asia/Kolkata")
        d_date = datetime.strptime(req.death_date, "%Y-%m-%d").date()
        results = []
        
        def process_scenario(scenario_time: time, is_predawn_scenario: bool):
            t_idx, effective_date, is_predawn = resolve_death_tithi(d_date, scenario_time, tz_name)
            jd_eff = get_julian_day(datetime.combine(effective_date, time(7, 0)), tz_name)
            m_idx = get_lunar_month_index(jd_eff, t_idx)
            was_malmaas = is_malmaas(jd_eff)
            
            shraad_date = calculate_target_shraad_date(req.target_year, m_idx, t_idx, was_malmaas, tz_name)
            
            future_dates = []
            for next_y in range(req.target_year + 1, req.target_year + 6):
                ny_date = calculate_target_shraad_date(next_y, m_idx, t_idx, was_malmaas, tz_name)
                if ny_date:
                    future_dates.append({
                        "year": next_y,
                        "date": ny_date.strftime("%A, %d %B %Y"),
                        "raw_date": ny_date.strftime("%Y-%m-%d")
                    })
                    
            return {
                "scenario_type": "exact" if req.knows_time else ("predawn" if is_predawn_scenario else "postdawn"),
                "effective_date_str": effective_date.strftime("%d %B %Y"),
                "is_predawn": is_predawn,
                "lunar_masa": MONTH_NAMES[m_idx],
                "official_tithi": format_tithi_name(t_idx),
                "shraad_date_str": shraad_date.strftime("%A, %d %B %Y") if shraad_date else None,
                "shraad_raw_date": shraad_date.strftime("%Y-%m-%d") if shraad_date else None,
                "future_dates": future_dates
            }

        if req.knows_time:
            hr, mn = map(int, req.death_time.split(":"))
            d_time = time(hr, mn)
            results.append(process_scenario(d_time, False))
        else:
            results.append(process_scenario(time(3, 0), True))
            results.append(process_scenario(time(8, 0), False))
            
        return {"success": True, "knows_time": req.knows_time, "results": results}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/reverse_lookup")
def api_reverse_lookup(req: ReverseLookupRequest):
    try:
        tz_name = COMMON_ZONES.get(req.timezone, "Asia/Kolkata")
        rev_month_idx = MONTH_NAMES.index(req.rev_month_name)
        
        tithi_ui_list = []
        for i in range(1, 16):
            if i == 15: tithi_ui_list.append("Purnima" if "Zoon" in req.rev_paksha else "Mawas (Amavasya)")
            else: tithi_ui_list.append(KASHMIRI_TITHIS[i - 1])
            
        t_base_idx = tithi_ui_list.index(req.rev_tithi_name) + 1
        if "Gat Pachh" in req.rev_paksha: t_base_idx += 15
            
        matched_dates = find_original_dates(req.rev_year, rev_month_idx, t_base_idx, tz_name)
        
        formatted_matches = []
        for d in matched_dates:
            formatted_matches.append({
                "date_formatted": d.strftime("%A, %d %B %Y"),
                "raw_date": d.strftime("%Y-%m-%d")
            })
            
        return {
            "success": True,
            "matches": formatted_matches,
            "tithi_formatted": format_tithi_name(t_base_idx),
            "month_name": req.rev_month_name,
            "year": req.rev_year
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/pitra_paksh")
def api_pitra_paksh(req: PitraPakshRequest):
    try:
        tz_name = COMMON_ZONES.get(req.timezone, "Asia/Kolkata")
        
        # Pitra Paksh officially begins on Ashvina Krishna Pratipada (Okdoh)
        # Month 6 (Ashvina) Tithis 16 (Okdoh) through 30 (Mawas)
        tithis_to_scan = [(6, t) for t in range(16, 31)]
        
        calendar_dict = {}
        
        for m_idx, t_idx in tithis_to_scan:
            s_date = calculate_target_shraad_date(req.target_year, m_idx, t_idx, False, tz_name)
            if s_date:
                d_str = s_date.strftime("%Y-%m-%d")
                if d_str not in calendar_dict:
                    calendar_dict[d_str] = {
                        "raw_date": d_str,
                        "day": s_date.strftime("%d"),
                        "month": s_date.strftime("%b"),
                        "weekday": s_date.strftime("%A"),
                        "tithis": []
                    }
                
                if t_idx == 30: t_name = "Mawas"
                else: t_name = KASHMIRI_TITHIS[t_idx - 1]
                
                if t_name not in calendar_dict[d_str]["tithis"]:
                    calendar_dict[d_str]["tithis"].append(t_name)
                    
        sorted_dates = sorted(calendar_dict.keys())
        results = [calendar_dict[k] for k in sorted_dates]
        return {"success": True, "year": req.target_year, "calendar": results}
    except Exception as e:
        return {"success": False, "error": str(e)}