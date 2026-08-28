<?php
require_once __DIR__ . '/../models/AppointmentModel.php';

class AppointmentController
{
    private AppointmentModel $model;

    public function __construct()
    {
        $this->model = new AppointmentModel();
    }

    public function handleRequest(): void
    {
        ob_start();
        $action = $_GET['action'] ?? '';

        if ($action === 'list') {
            $date   = $_GET['date'] ?? date('Y-m-d');
            $search = trim($_GET['search'] ?? '');
            $status = trim($_GET['status'] ?? 'todos');

            $this->json($this->model->getByDate($date, $search, $status));
        }

        if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = [
                'patient_name' => trim($_POST['patient_name'] ?? ''),
                'phone'        => trim($_POST['phone']        ?? ''),
                'social_work'  => trim($_POST['social_work']  ?? ''),
                'payment'      => floatval($_POST['payment']  ?? 0),
                'doctor'       => trim($_POST['doctor']       ?? ''),
                'notes'        => trim($_POST['notes']        ?? ''),
                'date'         => $_POST['date']              ?? '',
                'time_start'   => $_POST['time_start']        ?? '',
                'time_end'     => $_POST['time_end']          ?? '',
                'status'       => trim($_POST['status']       ?? 'Reservado'),
            ];
            // Validación server-side mínima de fecha y horarios
            $validationError = $this->validateAppointmentDateTime($data['date'], $data['time_start'], $data['time_end']);
            if ($validationError !== true) {
                // Devolver formato de error compatible con frontend
                $this->json(['success' => false, 'error' => $validationError]);
            }

            $this->json(['success' => $this->model->create($data)]);
        }

        if ($action === 'update_status' && $_SERVER['REQUEST_METHOD'] === 'POST') {
            $id = intval($_POST['id'] ?? 0);
            $status = trim($_POST['status'] ?? '');
            $this->json(['success' => $this->model->updateStatus($id, $status)]);
        }

        if ($action === 'history') {
            $id = intval($_GET['id'] ?? 0);
            $this->json($this->model->getHistory($id));
        }

        if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
            $id = intval($_POST['id'] ?? 0);
            $this->json(['success' => $this->model->delete($id)]);
        }
    }

    private function json(mixed $data, int $status = 200): void
    {
        ob_end_clean();
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }

    /**
     * Validates date and time inputs for an appointment.
     * Returns true when valid, or a string message describing the error.
     */
    private function validateAppointmentDateTime(string $date, string $timeStart, string $timeEnd)
    {
        // Date validation: expect YYYY-MM-DD
        $date = trim($date);
        if ($date === '') {
            return 'La fecha es obligatoria.';
        }
        $d = \DateTime::createFromFormat('Y-m-d', $date);
        if (!($d && $d->format('Y-m-d') === $date)) {
            return 'Formato de fecha inválido. Use AAAA-MM-DD.';
        }

        // Time validation: accept HH:MM or HH:MM:SS
        $timeStart = trim($timeStart);
        $timeEnd = trim($timeEnd);
        if ($timeStart === '') {
            return 'La hora de inicio es obligatoria.';
        }
        if ($timeEnd === '') {
            return 'La hora de fin es obligatoria.';
        }

        $parseTime = function (string $t) {
            // Accept HH:MM or HH:MM:SS
            if (!preg_match('/^(\d{1,2}):(\d{2})(:(\d{2}))?$/', $t, $m)) {
                return false;
            }
            $h = (int)$m[1];
            $i = (int)$m[2];
            $s = isset($m[4]) ? (int)$m[4] : 0;
            if ($h < 0 || $h > 23 || $i < 0 || $i > 59 || $s < 0 || $s > 59) return false;
            return $h * 3600 + $i * 60 + $s;
        };

        $sSec = $parseTime($timeStart);
        if ($sSec === false) return 'Hora de inicio inválida. Use HH:MM o HH:MM:SS.';
        $eSec = $parseTime($timeEnd);
        if ($eSec === false) return 'Hora de fin inválida. Use HH:MM o HH:MM:SS.';

        if ($sSec >= $eSec) return 'La hora de inicio debe ser anterior a la hora de fin.';

        return true;
    }
}
