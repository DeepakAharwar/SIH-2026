from typing import Dict, Any

ADVISORY_CATALOG: Dict[str, Dict[str, Any]] = {
    "Porosity": {
        "contributing_factors": [
            "Shielding gas turbulence or inadequate nozzle flow rate resulting in atmospheric air entrainment",
            "Moisture, hydrocarbon oils, or rust scale contaminants on base metal surface or joint groove",
            "Excessive laser welding travel speed preventing gas bubble outgassing from molten keyhole",
            "Contaminated gas cylinder supply or leaking gas delivery hose line"
        ],
        "suggested_verifications": [
            "Measure shielding gas flow rate at the torch nozzle using a calibrated gas rotameter",
            "Perform solvent degreasing and surface wipe check on raw metal stock prior to laser pass",
            "Verify shielding gas purity rating (minimum 99.998% Argon or Argon/Helium mix for keyhole stability)",
            "Conduct macro-etch section examination to determine if pores are subsurface or surface-breaking"
        ],
        "corrective_actions": [
            "Increase shielding gas flow rate to 18-22 L/min and ensure gas trailing cup coverage",
            "Pre-clean joint bevels with acetone or isopropyl alcohol immediately before welding",
            "Reduce welding traverse speed by 10-15% to allow molten pool degassing time",
            "Inspect laser cover slide for spatter contamination causing beam distortion and keyhole collapse"
        ]
    },
    "Crack": {
        "contributing_factors": [
            "Steep thermal cooling gradients induced by high-energy-density focused laser beam",
            "Excessive joint mechanical restraint generating severe residual transverse tensile stress",
            "Solidification hot-cracking caused by segregation of low-melting-point trace elements (S, P)",
            "Improper laser pulse termination or sudden beam shutoff creating crater center cracks"
        ],
        "suggested_verifications": [
            "Perform Liquid Penetrant Testing (PT) or Magnetic Particle Inspection (MT) to map crack endpoints",
            "Review material mill test certificates (MTR) for carbon equivalent (CE) and sulfur content",
            "Inspect laser optic down-slope power profile at seam start/stop crater points",
            "Check weld fixturing clamp pressure to verify restraint is within acceptable limits"
        ],
        "corrective_actions": [
            "Program laser power down-slope ramp (crater fill cycle) over 200-400 ms at weld termination",
            "Apply workpiece preheating (120°C - 180°C) to reduce thermal cooling rate (dT/dt)",
            "Slightly defocus laser beam or utilize beam oscillation (weaving) to broaden fusion zone",
            "Route component for mandatory non-destructive engineering evaluation; reject or grind and re-weld per procedure"
        ]
    },
    "Incomplete Penetration": {
        "contributing_factors": [
            "Insufficient laser continuous-wave (CW) or peak pulse power for the material thickness",
            "Welding speed too high, causing keyhole depth to trail behind the thermal conduction threshold",
            "Laser beam focal position positioned too high above top surface (focal plane mismatch)",
            "Laser beam tracking misalignment off the seam joint centerline"
        ],
        "suggested_verifications": [
            "Cut transverse cross-section, polish, and perform chemical acid etch to measure actual penetration depth",
            "Inspect optical seam tracker alignment relative to the mechanical weld joint line",
            "Verify laser focal position with beam profiler or acrylic focus burn print"
        ],
        "corrective_actions": [
            "Increase laser power by 10-20% or decrease travel speed to increase linear heat input (kJ/mm)",
            "Adjust laser optical Z-axis focus into the workpiece (-1.0 mm to -2.0 mm relative to top plate)",
            "Re-calibrate vision/optical joint tracking system coordinates to center beam on joint seam",
            "Verify joint root face and gap tolerances adhere to the Laser Welding Procedure Specification (WPS)"
        ]
    },
    "Burn-through": {
        "contributing_factors": [
            "Excessive linear heat input (kJ/mm) causing complete melt-through and gravitational drop-out",
            "Excessive joint gap tolerance or mismatched plate fit-up without backing",
            "Welding travel speed too slow for current laser power density",
            "Localized material gauge thinning below nominal specification"
        ],
        "suggested_verifications": [
            "Inspect plate root gap using precision feeler gauges prior to clamping",
            "Verify workpiece wall thickness tolerance with ultrasonic thickness gauge",
            "Check laser pulse repetition rate and peak energy stability"
        ],
        "corrective_actions": [
            "Reduce laser peak power or increase welding travel speed to curtail total heat input",
            "Tighten joint fit-up clamping to guarantee zero-gap fit (gap < 0.1 mm for laser autogenous welds)",
            "Implement copper or ceramic backing bar underneath the joint line to support molten puddle",
            "Switch from continuous-wave (CW) to modulated pulsed mode if welding thin foil/sheet (<1.0 mm)"
        ]
    },
    "Underfill": {
        "contributing_factors": [
            "Excessive molten metal vaporization due to extreme laser power density in keyhole",
            "Weld joint gap opening under thermal expansion without supplementary filler material",
            "Improper beam oscillation geometry causing molten metal ejection"
        ],
        "suggested_verifications": [
            "Measure concavity depth relative to base plate surface with optical profilometer or dial gauge",
            "Inspect joint bevel preparation for missing metal or excessive chamfer"
        ],
        "corrective_actions": [
            "Introduce cold or hot filler wire feed to compensate for gap volume",
            "Slightly reduce laser power density or broaden focal spot with twin-spot or wobble optics",
            "Optimize joint fit-up clamping to minimize seam expansion during heating"
        ]
    },
    "Weld Discontinuity": {
        "contributing_factors": [
            "Intermittent laser beam delivery or optical spatter on protective quartz cover glass",
            "Unstable shielding gas laminar flow (turbulence caused by draft or uneven gas cup)",
            "Mechanical vibration or stepper drive jerk in the workpiece positioning axis"
        ],
        "suggested_verifications": [
            "Inspect laser protective window for burn spots, dust particles, or thermal lensing distortion",
            "Inspect motion axis linear guides and ball screws for mechanical backlash",
            "Check gas supply line pressure regulator for intermittent dropouts"
        ],
        "corrective_actions": [
            "Clean or replace optical protective cover slide glass",
            "Dampen machine vibration and inspect motion axis drive motor tuning",
            "Install shielding gas draft enclosure around the welding station"
        ]
    },
    "Good Weld (No Defect)": {
        "contributing_factors": [
            "Optimal balance of laser power density, travel speed, and focal position",
            "High joint cleanliness and pristine shielding gas coverage",
            "Proper fixture clamping maintaining uniform zero-gap seam contact"
        ],
        "suggested_verifications": [
            "Maintain standard production sampling frequency per quality management plan (ISO 9001 / IATF 16949)",
            "Record process telemetry logs (power, speed, gas flow) for ongoing statistical process control (SPC)"
        ],
        "corrective_actions": [
            "Component cleared for downstream assembly or shipment",
            "Retain inspection record in digital audit database"
        ]
    }
}

STANDARD_DISCLAIMER = (
    "ENGINEERING ADVISORY NOTICE: The recommendations above are software-generated quality guidance "
    "based on visible surface defect morphology. All corrective measures must be reviewed and authorized "
    "by a Certified Welding Inspector (CWI / IWE) and qualified welding engineer in accordance with "
    "applicable standards (e.g. AWS D1.1, ISO 13919-1, ISO 5817). WeldGuard AI does not command or "
    "alter physical machine settings."
)

def get_recommendations_for_defect(defect_class: str) -> Dict[str, Any]:
    catalog_entry = ADVISORY_CATALOG.get(defect_class, ADVISORY_CATALOG["Good Weld (No Defect)"])
    return {
        "defect_class": defect_class,
        "contributing_factors": catalog_entry["contributing_factors"],
        "suggested_verifications": catalog_entry["suggested_verifications"],
        "corrective_actions": catalog_entry["corrective_actions"],
        "disclaimer": STANDARD_DISCLAIMER
    }
