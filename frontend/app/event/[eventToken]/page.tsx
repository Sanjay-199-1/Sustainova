'use client';

import { AxiosError } from 'axios';
import { useParams } from 'next/navigation';
import { ChangeEvent, useEffect, useState } from 'react';
import LuxurySelect from '../../../components/LuxurySelect';
import api from '../../../services/api';
import { formatPhoneForInput, normalizePhone } from '../../../services/phone';

const phoneRegex = /^[6-9]\d{9}$/;
const aadhaarRegex = /^\d{12}$/;

export default function GuestPage() {
  const params = useParams();
  const eventToken = params.eventToken as string;

  const [form, setForm] = useState({
    name: '',
    phone: '',
    number_of_people: 1,
    coming_from: '',
    transport_type: '',
    car_count: 0,
    bike_count: 0,
    car_numbers: [] as string[],
    bike_numbers: [] as string[],
    needs_room: 'No',
    aadhar_number: '',
    room_type: '',
  });

  const [transportType, setTransportType] = useState('');
  const [status, setStatus] = useState('');
  const [guestQrCodeUrl, setGuestQrCodeUrl] = useState('');

  const phoneValid = phoneRegex.test(normalizePhone(form.phone));
  const phoneError = form.phone && !phoneValid ? 'Enter a valid 10-digit phone number' : '';
  const aadhaarRequired = form.needs_room === 'Yes';
  const aadhaarFilled = form.aadhar_number.trim().length > 0;
  const aadhaarValid = aadhaarRequired
    ? aadhaarRegex.test(form.aadhar_number)
    : !aadhaarFilled || aadhaarRegex.test(form.aadhar_number);
  const aadhaarError =
    (aadhaarRequired || aadhaarFilled) && !aadhaarValid
      ? 'Enter a valid 12-digit Aadhaar number'
      : '';
  const isSubmitDisabled = !phoneValid || !aadhaarValid;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === 'number_of_people'
          ? Number(value)
          : name === 'aadhar_number'
            ? value.replace(/\D/g, '').slice(0, 12)
          : name === 'phone'
            ? formatPhoneForInput(value)
            : value,
    }));
  };

  const setSelectValue = (name: 'transport_type' | 'needs_room', value: string) => {
    if (name === 'transport_type') {
      setTransportType(value.trim().toLowerCase());
    }
    setForm((prev) => {
      if (name === 'transport_type') {
        return { ...prev, [name]: value.trim().toLowerCase() };
      }
      if (name === 'needs_room' && value === 'No') {
        return { ...prev, [name]: value, aadhar_number: '', room_type: '' };
      }
      return { ...prev, [name]: value };
    });
  };

  useEffect(() => {
    const normalizedTransport = transportType.trim().toLowerCase();
    if (normalizedTransport === 'car') {
      setForm((prev) => ({
        ...prev,
        bike_count: 0,
        bike_numbers: [],
      }));
      return;
    }
    if (normalizedTransport === 'bike') {
      setForm((prev) => ({
        ...prev,
        car_count: 0,
        car_numbers: [],
      }));
      return;
    }
    if (normalizedTransport === '' || normalizedTransport === 'public transport') {
      setForm((prev) => ({
        ...prev,
        car_count: 0,
        bike_count: 0,
        car_numbers: [],
        bike_numbers: [],
      }));
    }
  }, [transportType]);

  const normalizeVehicleNumber = (value: string) =>
    value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  const isValidVehicleNumber = (value: string) => {
    const normalized = normalizeVehicleNumber(value);
    return normalized.length >= 6 && normalized.length <= 12;
  };

  const updateVehicleCount = (kind: 'car' | 'bike', nextValue: number) => {
    const safeValue = Math.max(0, Math.floor(Number.isFinite(nextValue) ? nextValue : 0));
    setForm((prev) => {
      const numbers = kind === 'car' ? [...prev.car_numbers] : [...prev.bike_numbers];
      if (numbers.length < safeValue) {
        while (numbers.length < safeValue) numbers.push('');
      } else if (numbers.length > safeValue) {
        numbers.length = safeValue;
      }
      return kind === 'car'
        ? { ...prev, car_count: safeValue, car_numbers: numbers }
        : { ...prev, bike_count: safeValue, bike_numbers: numbers };
    });
  };

  const updateVehicleNumber = (kind: 'car' | 'bike', index: number, value: string) => {
    const normalized = normalizeVehicleNumber(value);
    setForm((prev) => {
      const numbers = kind === 'car' ? [...prev.car_numbers] : [...prev.bike_numbers];
      numbers[index] = normalized;
      return kind === 'car'
        ? { ...prev, car_numbers: numbers }
        : { ...prev, bike_numbers: numbers };
    });
  };

  const submit = async (e: any) => {
    e.preventDefault();

    if (!form.transport_type) {
      setStatus('Please select transport type');
      return;
    }
    const carCount = Number(form.car_count) || 0;
    const bikeCount = Number(form.bike_count) || 0;

    if (carCount > 0 && form.car_numbers.length !== carCount) {
      setStatus('Please enter all car numbers');
      return;
    }
    if (bikeCount > 0 && form.bike_numbers.length !== bikeCount) {
      setStatus('Please enter all bike numbers');
      return;
    }
    for (let i = 0; i < form.car_numbers.length; i += 1) {
      if (!isValidVehicleNumber(form.car_numbers[i])) {
        setStatus(`Invalid car number at position ${i + 1}`);
        return;
      }
    }
    for (let i = 0; i < form.bike_numbers.length; i += 1) {
      if (!isValidVehicleNumber(form.bike_numbers[i])) {
        setStatus(`Invalid bike number at position ${i + 1}`);
        return;
      }
    }

    try {
      const parking_type =
        carCount > 0 && bikeCount === 0
          ? 'Car'
          : bikeCount > 0 && carCount === 0
            ? 'Bike'
            : 'None';
      const vehicle_number =
        form.car_numbers[0] || form.bike_numbers[0] || '';
      const res = await api.post('/guests/rsvp', {
        ...form,
        parking_type,
        car_count: carCount,
        bike_count: bikeCount,
        vehicle_number: vehicle_number || null,
        car_numbers: form.car_numbers,
        bike_numbers: form.bike_numbers,
        phone: normalizePhone(form.phone),
        event_token: eventToken,
      });

      setGuestQrCodeUrl(res.data?.guest_qr_code_url || '');

      setStatus('RSVP submitted successfully');
      setForm({
        name: '',
        phone: '',
        number_of_people: 1,
        coming_from: '',
        transport_type: '',
        car_count: 0,
        bike_count: 0,
        car_numbers: [],
        bike_numbers: [],
        needs_room: 'No',
        aadhar_number: '',
        room_type: '',
      });
      setTransportType('');
    } catch (err: unknown) {
      const apiErr = err as AxiosError<{ detail?: string }>;
      setStatus(apiErr.response?.data?.detail || 'Something went wrong');
    }
  };

  const normalizedTransport = transportType.trim().toLowerCase();
  const shouldShowCarParking = normalizedTransport === 'car' || normalizedTransport === 'both';
  const shouldShowBikeParking = normalizedTransport === 'bike' || normalizedTransport === 'both';
  const shouldShowParking = shouldShowCarParking || shouldShowBikeParking;
  const transportOptions = [
    { label: 'Bike', value: 'bike' },
    { label: 'Car', value: 'car' },
    { label: 'Both', value: 'both' },
    { label: 'Public Transport', value: 'public transport' },
  ];
  const roomTypeOptions = [
    { label: 'Single Bed', value: 'Single Bed' },
    { label: 'Double Bed', value: 'Double Bed' },
    { label: 'Family', value: 'Triple Bed' },
  ];

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <section className="premium-card hover:-translate-y-2 transition-all duration-300 w-full max-w-2xl text-center">
        <h1 className="font-serif text-5xl">Event RSVP</h1>
        <div className="h-px w-40 bg-gradient-to-r from-transparent via-[#C6A75E] to-transparent mx-auto my-6" />

        <form onSubmit={submit} className="form-stack text-left">
          <div>
            <label className="form-label">Full Name</label>
            <input name="name" value={form.name} placeholder="Enter your full name" required onChange={handleChange} className="premium-input" />
          </div>
          <div>
            <label className="form-label">Mobile Number</label>
            <input
              name="phone"
              value={form.phone}
              placeholder="Enter your mobile number"
              required
              onChange={handleChange}
              inputMode="numeric"
              maxLength={11}
              className={`premium-input ${phoneError ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]' : ''}`}
            />
            {phoneError && <p className="mt-1 text-sm text-red-600">{phoneError}</p>}
          </div>
          <div>
            <label className="form-label">Number of People</label>
            <input
              name="number_of_people"
              type="number"
              min={1}
              step={1}
              value={form.number_of_people}
              placeholder="Enter total number of attendees from your side"
              required
              onChange={handleChange}
              className="premium-input number-spinner"
            />
          </div>
          <div>
            <label className="form-label">Coming From</label>
            <input
              name="coming_from"
              value={form.coming_from}
              placeholder="Enter the city/location you are traveling from"
              onChange={handleChange}
              className="premium-input"
            />
          </div>

          <LuxurySelect
            value={form.transport_type}
            options={transportOptions}
            placeholder="Transport Type"
            onChange={(value: string) => setSelectValue('transport_type', value)}
          />

          <p className="text-sm text-[var(--text-soft)]">
            For better event arrangements, please let us know your parking and accommodation needs.
          </p>

          {shouldShowParking && (
            <div className="space-y-2 transition-all duration-300">
              <h3 className="font-semibold text-lg text-[#1F4F46]">Parking Requirement</h3>
              <p className="text-sm text-[var(--text-soft)]">
                Add counts for cars and bikes to generate vehicle number inputs.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {shouldShowCarParking && (
                  <div className="rounded-2xl border border-[#C6A75E]/30 bg-[#fffdf8] p-4">
                    <p className="text-sm font-semibold text-[var(--text-dark)]">Cars</p>
                    <label className="mt-3 block text-sm text-[var(--text-soft)]" htmlFor="car_count">
                      Number of Cars
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateVehicleCount('car', form.car_count - 1)}
                        className="h-10 w-10 rounded-xl border border-[#C6A75E]/35 bg-white text-lg text-[var(--text-dark)] transition hover:bg-[#f6f2e6]"
                        aria-label="Decrease car count"
                      >
                        -
                      </button>
                      <input
                        id="car_count"
                        name="car_count"
                        type="number"
                        min={0}
                        step={1}
                        value={form.car_count}
                        onChange={(e) => updateVehicleCount('car', Number(e.target.value))}
                        className="premium-input number-spinner text-center"
                      />
                      <button
                        type="button"
                        onClick={() => updateVehicleCount('car', form.car_count + 1)}
                        className="h-10 w-10 rounded-xl border border-[#C6A75E]/35 bg-white text-lg text-[var(--text-dark)] transition hover:bg-[#f6f2e6]"
                        aria-label="Increase car count"
                      >
                        +
                      </button>
                    </div>

                    {form.car_count > 0 && (
                      <div className="mt-4 space-y-2">
                        {form.car_numbers.map((value, index) => (
                          <div key={`car-${index}`} className="space-y-1">
                            <label className="text-xs text-[var(--text-soft)]">{`Car Number ${index + 1}`}</label>
                            <input
                              value={value}
                              onChange={(e) => updateVehicleNumber('car', index, e.target.value)}
                              placeholder="TN01AB1234"
                              className="premium-input"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {shouldShowBikeParking && (
                  <div className="rounded-2xl border border-[#C6A75E]/30 bg-[#fffdf8] p-4">
                    <p className="text-sm font-semibold text-[var(--text-dark)]">Bikes</p>
                    <label className="mt-3 block text-sm text-[var(--text-soft)]" htmlFor="bike_count">
                      Number of Bikes
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateVehicleCount('bike', form.bike_count - 1)}
                        className="h-10 w-10 rounded-xl border border-[#C6A75E]/35 bg-white text-lg text-[var(--text-dark)] transition hover:bg-[#f6f2e6]"
                        aria-label="Decrease bike count"
                      >
                        -
                      </button>
                      <input
                        id="bike_count"
                        name="bike_count"
                        type="number"
                        min={0}
                        step={1}
                        value={form.bike_count}
                        onChange={(e) => updateVehicleCount('bike', Number(e.target.value))}
                        className="premium-input number-spinner text-center"
                      />
                      <button
                        type="button"
                        onClick={() => updateVehicleCount('bike', form.bike_count + 1)}
                        className="h-10 w-10 rounded-xl border border-[#C6A75E]/35 bg-white text-lg text-[var(--text-dark)] transition hover:bg-[#f6f2e6]"
                        aria-label="Increase bike count"
                      >
                        +
                      </button>
                    </div>

                    {form.bike_count > 0 && (
                      <div className="mt-4 space-y-2">
                        {form.bike_numbers.map((value, index) => (
                          <div key={`bike-${index}`} className="space-y-1">
                            <label className="text-xs text-[var(--text-soft)]">{`Bike Number ${index + 1}`}</label>
                            <input
                              value={value}
                              onChange={(e) => updateVehicleNumber('bike', index, e.target.value)}
                              placeholder="TN10XY9876"
                              className="premium-input"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-[#1F4F46]">Do you need accommodation (room)?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { value: 'Yes', label: 'Yes, I need a room' },
                { value: 'No', label: 'No room required' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`border rounded-2xl p-4 cursor-pointer hover:border-[#C6A75E] transition-all ${
                    form.needs_room === option.value
                      ? 'border-[#C6A75E] bg-[#C6A75E]/10'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="needs_room"
                    value={option.value}
                    checked={form.needs_room === option.value}
                    onChange={(e) => setSelectValue('needs_room', e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-sm text-[var(--text-dark)]">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {form.needs_room === 'Yes' && (
            <div className="space-y-4">
              <input
                name="aadhar_number"
                value={form.aadhar_number}
                placeholder="Enter 12-digit Aadhar number"
                onChange={handleChange}
                inputMode="numeric"
                maxLength={12}
                className={`premium-input ${aadhaarError ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]' : ''}`}
              />
              {aadhaarError && <p className="mt-1 text-sm text-red-600">{aadhaarError}</p>}
              <LuxurySelect
                value={form.room_type}
                options={roomTypeOptions}
                placeholder="Select Room Type"
                onChange={(value: string) =>
                  setForm((prev) => ({ ...prev, room_type: value }))
                }
              />
            </div>
          )}

          <button
            className="gold-button w-full disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isSubmitDisabled}
          >
            Submit RSVP
          </button>
        </form>

        {status && <p className="mt-4 text-center text-[var(--emerald)]">{status}</p>}
        {guestQrCodeUrl && (
          <div className="mt-6 rounded-2xl border border-[#C6A75E]/30 bg-[#fffdf8] p-4">
            <p className="text-sm text-[var(--text-soft)] mb-3">
              Save this QR for entrance check-in.
            </p>
            <img
              src={guestQrCodeUrl}
              alt="Guest check-in QR"
              className="mx-auto h-48 w-48 rounded-xl border border-[#C6A75E]/30 bg-white p-2"
            />
          </div>
        )}
      </section>
    </main>
  );
}

