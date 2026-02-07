package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type DataHubService struct {
	BaseURL    string
	HTTPClient *http.Client
}

type TelemetryRecord struct {
	DeviceID   string    `json:"device_id"`
	Metric     string    `json:"metric"`
	Value      float64   `json:"value"`
	Unit       string    `json:"unit"`
	RecordedAt time.Time `json:"recorded_at,omitempty"`
}

func NewDataHubService(baseURL string) *DataHubService {
	return &DataHubService{
		BaseURL: baseURL,
		HTTPClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func SensorIDToDeviceUUID(sensorID int) string {
	return fmt.Sprintf("00000000-0000-0000-0000-%012d", sensorID)
}

func (s *DataHubService) PostTelemetry(deviceID, metric string, value float64, unit string, recordedAt time.Time) error {
	if s.BaseURL == "" {
		return nil
	}
	body := TelemetryRecord{
		DeviceID:   deviceID,
		Metric:     metric,
		Value:      value,
		Unit:       unit,
		RecordedAt: recordedAt,
	}
	if body.RecordedAt.IsZero() {
		body.RecordedAt = time.Now()
	}
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshal telemetry: %w", err)
	}
	url := s.BaseURL + "/api/v1/telemetry"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(jsonBody))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("send telemetry: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("data hub returned status %d", resp.StatusCode)
	}
	return nil
}
