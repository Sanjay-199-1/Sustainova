from datetime import datetime
from typing import Optional
import re
from pydantic import BaseModel, EmailStr, Field, field_validator

PHONE_REGEX = re.compile(r'^[6-9]\d{9}$')
EMAIL_REGEX = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
AADHAAR_REGEX = re.compile(r'^\d{12}$')


def _normalize_phone(value: str) -> str:
    return value.strip().replace("+91", "").replace(" ", "").replace("-", "")


def _validate_phone(value: str) -> str:
    cleaned = _normalize_phone(value)
    if not PHONE_REGEX.match(cleaned):
        raise ValueError("Enter a valid 10-digit phone number")
    return cleaned


def _validate_email(value: str) -> str:
    if not EMAIL_REGEX.match(value):
        raise ValueError("Enter a valid email address")
    return value


def _validate_aadhaar(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    cleaned = re.sub(r"\D", "", value)
    if not AADHAAR_REGEX.match(cleaned):
        raise ValueError("Enter a valid 12-digit Aadhaar number")
    return cleaned


# ---------------- USER ----------------

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return _validate_phone(value)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _validate_email(value)


class OrganizerRegister(BaseModel):
    name: str
    email: EmailStr
    phone: str
    event_name: str
    event_date: Optional[datetime] = None
    location: str
    hall_name: str
    bus_routes: str
    bus_stops: str
    expected_count: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    invitation_image_url: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return _validate_phone(value)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _validate_email(value)


class OTPRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return _validate_phone(value)


class OTPVerify(BaseModel):
    phone: str
    otp: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return _validate_phone(value)


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: Optional[str]

    class Config:
        from_attributes = True


# ---------------- EVENT ----------------

class EventCreate(BaseModel):
    event_name: str
    location: Optional[str] = None
    hall_name: Optional[str] = None
    bus_routes: Optional[str] = None
    bus_stops: Optional[str] = None
    expected_count: Optional[int] = None
    event_date: Optional[datetime] = None
    invitation_image: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class EventOut(BaseModel):
    id: int
    user_id: int
    event_token: str
    event_name: str
    event_date: Optional[datetime]
    location: str
    hall_name: str
    bus_routes: Optional[str]
    bus_stops: Optional[str]
    expected_count: int
    invitation_image: Optional[str]
    invitation_image_url: Optional[str]
    qr_code_url: Optional[str]
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True


# ---------------- GUEST ----------------

class GuestCreate(BaseModel):
    name: str
    phone: str
    number_of_people: int = 1
    coming_from: Optional[str] = None
    transport_type: Optional[str] = None
    parking_type: Optional[str] = "None"
    car_count: Optional[int] = None
    bike_count: Optional[int] = None
    vehicle_number: Optional[str] = None
    car_numbers: Optional[list[str]] = None
    bike_numbers: Optional[list[str]] = None
    needs_room: Optional[str] = None
    aadhar_number: Optional[str] = None
    room_type: Optional[str] = None
    event_id: int

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return _validate_phone(value)

    @field_validator("aadhar_number")
    @classmethod
    def validate_aadhaar(cls, value: str | None) -> str | None:
        return _validate_aadhaar(value)


class GuestRSVPCreate(BaseModel):
    name: str
    phone: str
    number_of_people: int = 1
    coming_from: Optional[str] = None
    transport_type: Optional[str] = None
    parking_type: Optional[str] = "None"
    car_count: Optional[int] = None
    bike_count: Optional[int] = None
    vehicle_number: Optional[str] = None
    car_numbers: Optional[list[str]] = None
    bike_numbers: Optional[list[str]] = None
    needs_room: Optional[str] = None
    aadhar_number: Optional[str] = None
    room_type: Optional[str] = None
    event_token: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return _validate_phone(value)

    @field_validator("aadhar_number")
    @classmethod
    def validate_aadhaar(cls, value: str | None) -> str | None:
        return _validate_aadhaar(value)


class GuestOut(BaseModel):
    id: int
    event_id: int
    name: str
    phone: str
    number_of_people: int
    coming_from: Optional[str] = None
    transport_type: Optional[str] = None
    parking_type: str
    car_count: int
    bike_count: int
    vehicle_number: Optional[str] = None
    car_numbers: Optional[list[str]] = None
    bike_numbers: Optional[list[str]] = None
    needs_room: Optional[str] = None
    aadhar_number: Optional[str] = None
    room_type: Optional[str] = None
    guest_qr_token: Optional[str] = None
    guest_qr_code_url: Optional[str] = None
    status: str

    class Config:
        from_attributes = True
# ---------------- ATTENDANCE ----------------

class AttendanceCreate(BaseModel):
    event_id: int
    guest_id: int
    actual_people_count: int


class AttendanceOut(BaseModel):
    id: int
    event_id: int
    guest_id: int
    actual_people_count: int
    scanned_at: datetime

    class Config:
        from_attributes = True


class CheckinResponse(BaseModel):
    status: str
    message: str
    guest_id: int
    guest_name: str
    event_id: int
    scanned_at: datetime
    checked_in_guests: int
    remaining_guests: int
    real_present_count: int


class GuestRegistrationUpdate(BaseModel):
    number_of_people: Optional[int] = None
    vehicle_type: Optional[str] = None
    vehicle_count: Optional[int] = None
    vehicle_number: Optional[str] = None


class GuestRegistrationStatusOut(BaseModel):
    guest_id: int
    status: str


# ---------------- ROOMS ----------------

class RoomAllocationCreate(BaseModel):
    guest_id: int
    event_id: int
    hotel_name: str = Field(..., min_length=2, max_length=200)
    room_number: str = Field(..., min_length=1, max_length=50)
    location: str = Field(..., min_length=2, max_length=500)


class RoomAllocationOut(BaseModel):
    id: int
    guest_id: int
    event_id: int
    hotel_name: str
    room_number: str
    location: str | None = None
    allocated_at: datetime

    class Config:
        from_attributes = True
# ---------------- SOS ----------------

class SOSCreate(BaseModel):
    event_id: int
    guest_id: int
    reason: str


class SOSTriggerIn(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500)


class SOSOut(BaseModel):
    id: int
    event_id: int
    guest_id: int
    reason: str
    triggered_at: datetime
    resolved: bool

    class Config:
        from_attributes = True


# ---------------- ANNOUNCEMENTS ----------------

class AnnouncementCreate(BaseModel):
    event_id: int
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=2000)


class AnnouncementOut(BaseModel):
    id: int
    event_id: int
    title: str
    message: str
    created_at: datetime
    created_by: int

    class Config:
        from_attributes = True


# ---------------- ML ----------------

class MLPredictRequest(BaseModel):
    event_id: Optional[int] = None
    weather: Optional[str] = "clear"
    group_size: Optional[int] = None
    transport_type: Optional[str] = None
    parking_required: Optional[str] = None
    room_required: Optional[str] = None
    distance_km: Optional[float] = None
    day_of_week: Optional[str] = None


class MLPredictResponse(BaseModel):
    predicted_attendance: int
    predicted_car_parking: int
    predicted_bike_parking: int
    predicted_rooms: int
    food_estimate: int
