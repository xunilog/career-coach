// src/renderer/components/editors/ResumePersonalInfoModal.tsx
// ---------------------------------------------------------------------------
// Modal for editing personal info section of the reference resume.
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import { TextInput, SimpleGrid, Button, Group, Text } from "@mantine/core";
import { AppModal } from "../shared/AppModal";
import type { ResumeData } from "../../../shared/state";

interface ResumePersonalInfoModalProps {
  opened: boolean;
  onClose: () => void;
  initial: Pick<
    ResumeData,
    | "firstName"
    | "lastName"
    | "phone"
    | "email"
    | "linkedin"
    | "otherNetworks"
    | "nationality"
    | "country"
  >;
  onSave: (
    data: Pick<
      ResumeData,
      | "firstName"
      | "lastName"
      | "phone"
      | "email"
      | "linkedin"
      | "otherNetworks"
      | "nationality"
      | "country"
    >,
  ) => void;
}

export function ResumePersonalInfoModal({
  opened,
  onClose,
  initial,
  onSave,
}: ResumePersonalInfoModalProps) {
  const [firstName, setFirstName] = useState(initial.firstName ?? "");
  const [lastName, setLastName] = useState(initial.lastName ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [linkedin, setLinkedin] = useState(initial.linkedin ?? "");
  const [otherNetworks, setOtherNetworks] = useState(initial.otherNetworks ?? "");
  const [nationality, setNationality] = useState(initial.nationality ?? "");
  const [country, setCountry] = useState(initial.country ?? "");

  // Reset form when modal opens with new initial values
  const [lastOpened, setLastOpened] = useState(false);
  if (opened && !lastOpened) {
    setFirstName(initial.firstName ?? "");
    setLastName(initial.lastName ?? "");
    setPhone(initial.phone ?? "");
    setEmail(initial.email ?? "");
    setLinkedin(initial.linkedin ?? "");
    setOtherNetworks(initial.otherNetworks ?? "");
    setNationality(initial.nationality ?? "");
    setCountry(initial.country ?? "");
    setLastOpened(true);
  }
  if (!opened && lastOpened) {
    setLastOpened(false);
  }

  const handleSave = useCallback(() => {
    onSave({
      firstName,
      lastName,
      phone,
      email,
      linkedin,
      otherNetworks,
      nationality,
      country,
    });
    onClose();
  }, [
    firstName,
    lastName,
    phone,
    email,
    linkedin,
    otherNetworks,
    nationality,
    country,
    onSave,
    onClose,
  ]);

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title="Personal Information"
      footer={
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="filled" onClick={handleSave}>
            Save
          </Button>
        </Group>
      }
    >
      <Text size="sm" c="dimmed" mb="md">
        Your name, contact details, nationality, and location. This information will appear at the
        top of every resume you generate.
      </Text>

      <SimpleGrid cols={2} spacing="sm">
        <TextInput
          label="First Name"
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.currentTarget.value)}
        />
        <TextInput
          label="Last Name"
          placeholder="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.currentTarget.value)}
        />
      </SimpleGrid>

      <SimpleGrid cols={2} spacing="sm" mt="sm">
        <TextInput
          label="Phone"
          placeholder="+33 6 12 34 56 78"
          value={phone}
          onChange={(e) => setPhone(e.currentTarget.value)}
        />
        <TextInput
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
        />
      </SimpleGrid>

      <TextInput
        label="LinkedIn"
        placeholder="linkedin.com/in/yourprofile"
        mt="sm"
        value={linkedin}
        onChange={(e) => setLinkedin(e.currentTarget.value)}
      />

      <TextInput
        label="Other Networks"
        placeholder="github.com/yourprofile, portfolio.com, ..."
        mt="sm"
        value={otherNetworks}
        onChange={(e) => setOtherNetworks(e.currentTarget.value)}
      />

      <SimpleGrid cols={2} spacing="sm" mt="sm">
        <TextInput
          label="Nationality"
          placeholder="French"
          value={nationality}
          onChange={(e) => setNationality(e.currentTarget.value)}
        />
        <TextInput
          label="Country of Residence"
          placeholder="France"
          value={country}
          onChange={(e) => setCountry(e.currentTarget.value)}
        />
      </SimpleGrid>
    </AppModal>
  );
}
