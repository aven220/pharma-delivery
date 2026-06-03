import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CreatePatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Atajo: abre el formulario completo de registro manual en página dedicada. */
export function CreatePatientModal({ open, onOpenChange }: CreatePatientModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registro manual de paciente</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          El registro manual crea paciente, entrega y medicamentos en un solo paso.
          Serás redirigido al formulario completo.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { onOpenChange(false); navigate('/patients/new'); }}>
            Continuar al formulario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
